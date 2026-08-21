import { BaseExtension, BaseTransport, createPromiseBuffer, getTransportBody, noop, VERSION } from '@grafana/faro-core';
import type { Config, Patterns, PromiseBuffer, TransportItem } from '@grafana/faro-core';

import { getSessionManagerByConfig } from '../../instrumentations/session/sessionManager';
import { getUserSessionUpdater } from '../../instrumentations/session/sessionManager/sessionManagerUtils';

import type { FetchTransportOptions } from './types';

const DEFAULT_BUFFER_SIZE = 30;
const DEFAULT_CONCURRENCY = 5; // chrome supports 10 total, firefox 17
const DEFAULT_RATE_LIMIT_BACKOFF_MS = 5000;
const MAX_ATTEMPTS = 3;
const INITIAL_BACKOFF_MS = 1000;
const BACKOFF_MULTIPLIER = 2;
const RETRYABLE_STATUS_CODES = new Set<number>([408, 425, 429, 500, 502, 503, 504]);
const MAX_ELAPSED_TIME_MS = 120000;

const BEACON_BODY_SIZE_LIMIT = 60000;
const MAX_KEEPALIVE_REQUESTS = 9;
const TOO_MANY_REQUESTS = 429;
const ACCEPTED = 202;

let pendingKeepaliveBodySize = 0;
let pendingKeepaliveRequests = 0;

interface KeepaliveReservation {
  keepalive: boolean;
  release: () => void;
}

interface RetryFailure {
  error?: unknown;
  status?: number;
}

/**
 * The browser keepalive budget is measured in bytes, while `String.length` counts UTF-16 code
 * units. A payload of non-ASCII text is up to three times larger than its length suggests, so
 * reserving by length lets Faro send far more than it accounted for and reintroduces the silent
 * keepalive failures this budget exists to prevent.
 */
function getBodyByteSize(body: string): number {
  if (typeof TextEncoder === 'undefined') {
    return body.length;
  }

  return new TextEncoder().encode(body).byteLength;
}

export class FetchTransport extends BaseTransport {
  readonly name = '@grafana/faro-web-sdk:transport-fetch';
  readonly version: string = VERSION;

  promiseBuffer: PromiseBuffer<Response | void>;

  private readonly rateLimitBackoffMs: number;
  private readonly getNow: () => number;
  private readonly compressionEnabled: boolean;
  private disabledUntil: Date = new Date(0);
  private rateLimitGeneration = 0;

  constructor(private options: FetchTransportOptions) {
    super();

    this.rateLimitBackoffMs = options.defaultRateLimitBackoffMs ?? DEFAULT_RATE_LIMIT_BACKOFF_MS;
    this.getNow = options.getNow ?? (() => Date.now());

    const requestCompression = options.requestCompression ?? false;

    if (requestCompression && typeof CompressionStream === 'undefined') {
      this.compressionEnabled = false;
      this.logWarn(
        'requestCompression is enabled but CompressionStream is not available. Falling back to uncompressed.'
      );
    } else {
      this.compressionEnabled = requestCompression;
    }

    this.promiseBuffer = createPromiseBuffer({
      size: options.bufferSize ?? DEFAULT_BUFFER_SIZE,
      concurrency: options.concurrency ?? DEFAULT_CONCURRENCY,
    });
  }

  async send(items: TransportItem[]): Promise<void> {
    try {
      if (this.disabledUntil > new Date(this.getNow())) {
        this.logWarn(`Dropping transport item due to too many requests. Backoff until ${this.disabledUntil}`);

        return Promise.resolve();
      }
      const admittedRateLimitGeneration = this.rateLimitGeneration;

      const jsonBody = JSON.stringify(getTransportBody(items));

      const { url, requestOptions, apiKey } = this.options;

      const { headers = {}, ...restOfRequestOptions } = requestOptions ?? {};
      const { keepalive: configuredKeepalive, ...requestOptionsWithoutKeepalive } = restOfRequestOptions;
      const callerSignal = requestOptionsWithoutKeepalive.signal;

      let sessionId;
      const sessionMeta = this.metas.value.session;
      if (sessionMeta != null) {
        sessionId = sessionMeta.id;
      }

      const resolvedHeaders: Record<string, string> = {};
      for (const [key, value] of Object.entries(headers)) {
        resolvedHeaders[key] = typeof value === 'function' ? await Promise.resolve(value()) : value;
      }

      let body: string | Blob = jsonBody;
      let bodySize = getBodyByteSize(jsonBody);
      const compressionHeaders: Record<string, string> = {};

      if (this.compressionEnabled) {
        body = await this.compress(jsonBody);
        bodySize = body.size;
        compressionHeaders['Content-Encoding'] = 'gzip';
      }

      const requestInit: RequestInit = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...compressionHeaders,
          ...resolvedHeaders,
          ...(apiKey ? { 'x-api-key': apiKey } : {}),
          ...(sessionId ? { 'x-faro-session-id': sessionId } : {}),
        },
        body,
        ...(requestOptionsWithoutKeepalive ?? {}),
      };

      await this.fetchWithRetry(
        url,
        requestInit,
        bodySize,
        configuredKeepalive,
        callerSignal,
        admittedRateLimitGeneration
      );
    } catch (err) {
      this.logError('Permanent delivery failure', {
        error: err,
        attempts: 0,
        elapsedTimeMs: 0,
      });
    }
  }

  override getIgnoreUrls(): Patterns {
    return ([this.options.url] as Patterns).concat(this.config.ignoreUrls ?? []);
  }

  override isBatched(): boolean {
    return true;
  }

  private async fetchWithRetry(
    url: string,
    requestInit: RequestInit,
    bodySize: number,
    configuredKeepalive: boolean | undefined,
    callerSignal: AbortSignal | null | undefined,
    admittedRateLimitGeneration: number
  ): Promise<Response | void> {
    const startedAt = this.getNow();
    let attempt = 1;
    let backoffAttempt = 1;
    let previousFailure: RetryFailure | undefined;
    let deliveryAmbiguous = false;
    let keepaliveDisabled = configuredKeepalive === false;
    let retryKeepaliveImmediately = false;
    let observedRateLimitGeneration = admittedRateLimitGeneration;
    const disableKeepalive = () => {
      keepaliveDisabled = true;
      retryKeepaliveImmediately = true;
    };

    for (;;) {
      if (callerSignal?.aborted) {
        this.logDebug('Delivery cancelled by caller', {
          attempts: attempt,
          elapsedTimeMs: this.getNow() - startedAt,
        });
        return;
      }
      const elapsedTimeMs = this.getNow() - startedAt;
      const remainingTimeMs = MAX_ELAPSED_TIME_MS - elapsedTimeMs;
      if (observedRateLimitGeneration < this.rateLimitGeneration) {
        observedRateLimitGeneration = this.rateLimitGeneration;
        const now = this.getNow();
        const rateLimitDelayMs = this.disabledUntil.getTime() - now;
        const remainingTimeMs = MAX_ELAPSED_TIME_MS - (now - startedAt);

        if (rateLimitDelayMs >= remainingTimeMs) {
          this.logRetriesExhausted(previousFailure ?? {}, attempt - 1, now - startedAt);
          return;
        }
        if (rateLimitDelayMs > 0) {
          if (!(await this.waitForRetry(rateLimitDelayMs, callerSignal)) || callerSignal?.aborted) {
            this.logDebug('Delivery cancelled by caller', {
              attempts: attempt - 1,
              elapsedTimeMs: this.getNow() - startedAt,
            });
            return;
          }
          continue;
        }
      }

      if (remainingTimeMs <= 0) {
        this.logRetriesExhausted(previousFailure ?? {}, attempt - 1, elapsedTimeMs);
        return;
      }

      let response: Response | undefined;
      let failure: RetryFailure;
      let delayMs: number;
      let maxAttempts: number;

      try {
        const bufferedResponse = await this.promiseBuffer.add(
          async () => {
            if (callerSignal?.aborted || observedRateLimitGeneration < this.rateLimitGeneration) {
              return;
            }

            const remainingTimeMs = MAX_ELAPSED_TIME_MS - (this.getNow() - startedAt);
            if (remainingTimeMs <= 0) {
              return;
            }

            const attemptResponse = await this.fetchWithKeepaliveRetry(
              url,
              requestInit,
              bodySize,
              keepaliveDisabled ? false : configuredKeepalive,
              disableKeepalive
            );
            if (attemptResponse.status === TOO_MANY_REQUESTS) {
              const rateLimitGeneration = this.updateRateLimit(attemptResponse);
              if (rateLimitGeneration != null) {
                observedRateLimitGeneration = rateLimitGeneration;
              }
            }
            return attemptResponse;
          },
          { allowOverflow: attempt > 1 }
        );
        if (bufferedResponse == null) {
          const elapsedAfterQueueMs = this.getNow() - startedAt;
          if (callerSignal?.aborted) {
            this.logDebug('Delivery cancelled by caller', {
              attempts: attempt - 1,
              elapsedTimeMs: elapsedAfterQueueMs,
            });
            return;
          }
          if (elapsedAfterQueueMs >= MAX_ELAPSED_TIME_MS) {
            this.logRetriesExhausted(previousFailure ?? {}, attempt - 1, elapsedAfterQueueMs);
            return;
          }
          continue;
        }
        response = bufferedResponse;

        if (response.status >= 200 && response.status < 300) {
          return response;
        }
        if (!RETRYABLE_STATUS_CODES.has(response.status)) {
          this.logError('Permanent delivery failure', {
            status: response.status,
            attempts: attempt,
            elapsedTimeMs: this.getNow() - startedAt,
          });
          return response;
        }

        failure = { status: response.status };
        maxAttempts = deliveryAmbiguous ? Math.min(MAX_ATTEMPTS, 2) : MAX_ATTEMPTS;

        const retryAfterMs =
          response.status === TOO_MANY_REQUESTS || response.status === 503
            ? this.getRetryAfterDelayMs(response)
            : undefined;
        if (retryAfterMs != null) {
          delayMs = retryAfterMs;
          backoffAttempt = 1;
        } else {
          delayMs = this.getExponentialBackoffMs(backoffAttempt);
          backoffAttempt++;
        }
      } catch (err) {
        if (callerSignal?.aborted) {
          this.logDebug('Delivery cancelled by caller', {
            attempts: attempt,
            elapsedTimeMs: this.getNow() - startedAt,
          });
          return;
        }

        const isAmbiguousFailure = this.isFetchNetworkError(err);
        if (!isAmbiguousFailure) {
          this.logError('Permanent delivery failure', {
            error: err,
            attempts: attempt,
            elapsedTimeMs: this.getNow() - startedAt,
          });
          return;
        }

        deliveryAmbiguous = true;
        failure = { error: err };
        maxAttempts = Math.min(MAX_ATTEMPTS, 2);
        if (retryKeepaliveImmediately) {
          delayMs = 0;
          retryKeepaliveImmediately = false;
        } else {
          delayMs = this.getExponentialBackoffMs(backoffAttempt);
          backoffAttempt++;
        }
      }

      const retry = await this.scheduleRetry(failure, delayMs, attempt, maxAttempts, startedAt, callerSignal);
      if (!retry) {
        return callerSignal?.aborted ? undefined : response;
      }

      previousFailure = failure;
      attempt = retry;
    }
  }

  private async scheduleRetry(
    failure: RetryFailure,
    delayMs: number,
    attempt: number,
    maxAttempts: number,
    startedAt: number,
    callerSignal?: AbortSignal | null
  ): Promise<number | undefined> {
    const elapsedTimeMs = this.getNow() - startedAt;
    const remainingTimeMs = MAX_ELAPSED_TIME_MS - elapsedTimeMs;

    if (attempt >= maxAttempts || delayMs >= remainingTimeMs) {
      this.logRetriesExhausted(failure, attempt, elapsedTimeMs);
      return;
    }

    this.logDebug(`Retrying failed request after ${delayMs}ms. Attempt ${attempt + 1}.`);
    if (!(await this.waitForRetry(delayMs, callerSignal)) || callerSignal?.aborted) {
      this.logDebug('Delivery cancelled by caller', {
        attempts: attempt,
        elapsedTimeMs: this.getNow() - startedAt,
      });
      return;
    }

    const elapsedAfterWaitMs = this.getNow() - startedAt;
    const remainingAfterWaitMs = MAX_ELAPSED_TIME_MS - elapsedAfterWaitMs;
    if (remainingAfterWaitMs <= 0) {
      this.logRetriesExhausted(failure, attempt, elapsedAfterWaitMs);
      return;
    }

    return attempt + 1;
  }

  private logRetriesExhausted(failure: RetryFailure, attempts: number, elapsedTimeMs: number): void {
    this.logError('Delivery retries exhausted', {
      ...failure,
      attempts,
      elapsedTimeMs,
    });
  }

  private waitForRetry(delayMs: number, callerSignal?: AbortSignal | null): Promise<boolean> {
    if (callerSignal?.aborted) {
      return Promise.resolve(false);
    }

    return new Promise<boolean>((resolve) => {
      const abortFromCaller = () => {
        clearTimeout(timeoutId);
        callerSignal?.removeEventListener('abort', abortFromCaller);
        resolve(false);
      };
      const timeoutId = setTimeout(() => {
        callerSignal?.removeEventListener('abort', abortFromCaller);
        resolve(true);
      }, delayMs);

      callerSignal?.addEventListener('abort', abortFromCaller, { once: true });
    });
  }

  private getExponentialBackoffMs(attempt: number): number {
    const backoffMs = INITIAL_BACKOFF_MS * BACKOFF_MULTIPLIER ** (attempt - 1);
    return backoffMs * (0.8 + Math.random() * 0.4);
  }

  private getRetryAfterDelayMs(response: Response): number | undefined {
    const retryAfterHeader = response.headers.get('Retry-After')?.trim();
    if (!retryAfterHeader) {
      return undefined;
    }

    if (/^\d+$/.test(retryAfterHeader)) {
      const delayMs = Number(retryAfterHeader) * 1000;
      return Number.isFinite(delayMs) ? delayMs : undefined;
    }

    const retryAt = Date.parse(retryAfterHeader);
    return Number.isNaN(retryAt) ? undefined : Math.max(0, retryAt - this.getNow());
  }

  private reserveKeepalive(bodySize: number, configuredKeepalive?: boolean): KeepaliveReservation {
    if (configuredKeepalive === false) {
      return {
        keepalive: false,
        release: noop,
      };
    }

    if (
      bodySize > BEACON_BODY_SIZE_LIMIT ||
      pendingKeepaliveBodySize + bodySize > BEACON_BODY_SIZE_LIMIT ||
      pendingKeepaliveRequests >= MAX_KEEPALIVE_REQUESTS
    ) {
      this.logDebug('Disabling keepalive because the pending keepalive request budget would be exceeded.');

      return {
        keepalive: false,
        release: noop,
      };
    }

    pendingKeepaliveBodySize += bodySize;
    pendingKeepaliveRequests++;

    let released = false;

    return {
      keepalive: true,
      release: () => {
        if (released) {
          return;
        }

        released = true;
        pendingKeepaliveBodySize = Math.max(0, pendingKeepaliveBodySize - bodySize);
        pendingKeepaliveRequests = Math.max(0, pendingKeepaliveRequests - 1);
      },
    };
  }

  private async fetchWithKeepaliveRetry(
    url: string,
    requestInit: RequestInit,
    bodySize: number,
    configuredKeepalive: boolean | undefined,
    disableKeepalive: () => void
  ): Promise<Response> {
    const keepaliveReservation = this.reserveKeepalive(bodySize, configuredKeepalive);

    try {
      const response = await fetch(url, {
        ...requestInit,
        keepalive: keepaliveReservation.keepalive,
      });

      return this.handleResponse(response);
    } catch (err) {
      if (keepaliveReservation.keepalive && !requestInit.signal?.aborted && this.isFetchNetworkError(err)) {
        this.logDebug('Retrying failed keepalive request with keepalive disabled.');
        disableKeepalive();
      }

      throw err;
    } finally {
      keepaliveReservation.release();
    }
  }

  private async handleResponse(response: Response): Promise<Response> {
    if (response.status === ACCEPTED) {
      const sessionExpired = response.headers.get('X-Faro-Session-Status') === 'invalid';

      if (sessionExpired) {
        this.extendFaroSession(this.config, this.logDebug);
      }
    }

    // read the body so the connection can be closed
    response.text().catch(noop);
    return response;
  }

  private updateRateLimit(response: Response): number | undefined {
    const disabledUntil = new Date(this.getNow() + (this.getRetryAfterDelayMs(response) ?? this.rateLimitBackoffMs));
    if (disabledUntil <= this.disabledUntil) {
      return undefined;
    }

    this.disabledUntil = disabledUntil;
    this.rateLimitGeneration++;
    this.logDebug(`Too many requests, backing off until ${this.disabledUntil}`);
    return this.rateLimitGeneration;
  }

  private isFetchNetworkError(err: unknown): boolean {
    return err instanceof TypeError;
  }

  private async compress(body: string): Promise<Blob> {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(body));
        controller.close();
      },
    }).pipeThrough(new CompressionStream('gzip'));

    const reader = stream.getReader();
    const chunks: BlobPart[] = [];
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      chunks.push(value);
    }
    return new Blob(chunks);
  }

  private extendFaroSession(config: Config, logDebug: BaseExtension['logDebug']) {
    const SessionExpiredString = `Session expired`;

    const sessionTrackingConfig = config.sessionTracking;

    if (sessionTrackingConfig?.enabled) {
      const { fetchUserSession, storeUserSession } = getSessionManagerByConfig(sessionTrackingConfig);

      getUserSessionUpdater({ fetchUserSession, storeUserSession })({ forceSessionExtend: true });

      logDebug(`${SessionExpiredString} created new session.`);
    } else {
      logDebug(`${SessionExpiredString}.`);
    }
  }
}
