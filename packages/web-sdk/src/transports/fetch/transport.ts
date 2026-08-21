import { BaseExtension, BaseTransport, createPromiseBuffer, getTransportBody, noop, VERSION } from '@grafana/faro-core';
import type { Config, Patterns, PromiseBuffer, TransportItem } from '@grafana/faro-core';

import { getSessionManagerByConfig } from '../../instrumentations/session/sessionManager';
import { getUserSessionUpdater } from '../../instrumentations/session/sessionManager/sessionManagerUtils';

import type { FetchTransportOptions, FetchTransportRetryOptions } from './types';

const DEFAULT_BUFFER_SIZE = 30;
const DEFAULT_CONCURRENCY = 5; // chrome supports 10 total, firefox 17
const DEFAULT_RATE_LIMIT_BACKOFF_MS = 5000;
const DEFAULT_RETRY_OPTIONS: FetchTransportRetryOptions = {
  maxAttempts: 3,
  initialBackoffMs: 1000,
  maxBackoffMs: 10000,
  backoffMultiplier: 2,
  retryableStatusCodes: [408, 425, 429, 500, 502, 503, 504],
  requestTimeoutMs: 30000,
  maxElapsedTimeMs: 120000,
};
const HTTP_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const IMF_FIXDATE_PATTERN =
  /^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun), (\d{2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{4}) (\d{2}):(\d{2}):(\d{2}) GMT$/;
const RFC850_DATE_PATTERN =
  /^(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday), (\d{2})-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-(\d{2}) (\d{2}):(\d{2}):(\d{2}) GMT$/;
const ASCTIME_DATE_PATTERN =
  /^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) ( [1-9]|\d{2}) (\d{2}):(\d{2}):(\d{2}) (\d{4})$/;
function validateRetryOptions(options: FetchTransportRetryOptions): void {
  const {
    maxAttempts,
    initialBackoffMs,
    maxBackoffMs,
    backoffMultiplier,
    retryableStatusCodes,
    requestTimeoutMs,
    maxElapsedTimeMs,
  } = options;

  const durations = [initialBackoffMs, maxBackoffMs, requestTimeoutMs, maxElapsedTimeMs];
  const statuses = new Set(retryableStatusCodes);

  if (
    !Number.isInteger(maxAttempts) ||
    maxAttempts < 1 ||
    maxAttempts > 5 ||
    durations.some((duration) => !Number.isFinite(duration) || duration <= 0) ||
    maxBackoffMs < initialBackoffMs ||
    !Number.isFinite(backoffMultiplier) ||
    backoffMultiplier < 1 ||
    statuses.size !== retryableStatusCodes.length ||
    retryableStatusCodes.some((status) => !Number.isInteger(status) || status < 300 || status > 599)
  ) {
    throw new TypeError('Invalid retry configuration');
  }
}

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

/**
 * The browser keepalive budget is measured in bytes, while `String.length` counts UTF-16 code
 * units. A payload of non-ASCII text is up to three times larger than its length suggests, so
 * reserving by length lets Faro send far more than it accounted for and reintroduces the silent
 * keepalive failures this budget exists to prevent.
 */
class RequestTimeoutError extends Error {
  constructor(readonly originalError: unknown) {
    super('Request timed out');
    this.name = 'RequestTimeoutError';
  }
}

interface RetryFailure {
  error?: unknown;
  status?: number;
}

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
  private readonly retryOptions: FetchTransportRetryOptions;
  private disabledUntil: Date = new Date(0);
  private rateLimitGeneration = 0;

  constructor(private options: FetchTransportOptions) {
    super();

    this.rateLimitBackoffMs = options.defaultRateLimitBackoffMs ?? DEFAULT_RATE_LIMIT_BACKOFF_MS;
    this.getNow = options.getNow ?? (() => Date.now());
    this.retryOptions = {
      ...DEFAULT_RETRY_OPTIONS,
      ...options.retry,
      retryableStatusCodes: [...(options.retry?.retryableStatusCodes ?? DEFAULT_RETRY_OPTIONS.retryableStatusCodes)],
    };
    validateRetryOptions(this.retryOptions);

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
      const {
        keepalive: configuredKeepalive,
        signal: callerSignal,
        ...requestOptionsWithoutKeepalive
      } = restOfRequestOptions;

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
      const remainingTimeMs = this.retryOptions.maxElapsedTimeMs - elapsedTimeMs;
      if (observedRateLimitGeneration < this.rateLimitGeneration) {
        observedRateLimitGeneration = this.rateLimitGeneration;
        const now = this.getNow();
        const rateLimitDelayMs = this.disabledUntil.getTime() - now;
        const remainingTimeMs = this.retryOptions.maxElapsedTimeMs - (now - startedAt);

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

            const remainingTimeMs =
              this.retryOptions.maxElapsedTimeMs - (this.getNow() - startedAt);
            if (remainingTimeMs <= 0) {
              return;
            }

            const attemptResponse = await this.fetchLogicalAttempt(
              url,
              requestInit,
              bodySize,
              keepaliveDisabled ? false : configuredKeepalive,
              disableKeepalive,
              callerSignal,
              remainingTimeMs
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
          if (elapsedAfterQueueMs >= this.retryOptions.maxElapsedTimeMs) {
            this.logRetriesExhausted(previousFailure ?? {}, attempt - 1, elapsedAfterQueueMs);
            return;
          }
          continue;
        }
        response = bufferedResponse;

        if (response.status >= 200 && response.status < 300) {
          return response;
        }
        if (!this.retryOptions.retryableStatusCodes.includes(response.status)) {
          this.logError('Permanent delivery failure', {
            status: response.status,
            attempts: attempt,
            elapsedTimeMs: this.getNow() - startedAt,
          });
          return response;
        }

        failure = { status: response.status };
        maxAttempts = deliveryAmbiguous ? Math.min(this.retryOptions.maxAttempts, 2) : this.retryOptions.maxAttempts;

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

        const isAmbiguousFailure = err instanceof RequestTimeoutError || this.isFetchNetworkError(err);
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
        maxAttempts = Math.min(this.retryOptions.maxAttempts, 2);
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

  private async fetchLogicalAttempt(
    url: string,
    requestInit: RequestInit,
    bodySize: number,
    configuredKeepalive: boolean | undefined,
    disableKeepalive: () => void,
    callerSignal: AbortSignal | null | undefined,
    remainingTimeMs: number
  ): Promise<Response> {
    if (typeof AbortController === 'undefined') {
      return this.fetchWithKeepaliveRetry(
        url,
        {
          ...requestInit,
          signal: callerSignal,
        },
        bodySize,
        configuredKeepalive,
        disableKeepalive
      );
    }

    const attemptController = new AbortController();
    let timedOut = false;
    const abortFromCaller = () => attemptController.abort();
    callerSignal?.addEventListener('abort', abortFromCaller, { once: true });

    const timeoutId = setTimeout(
      () => {
        timedOut = true;
        attemptController.abort();
      },
      Math.min(this.retryOptions.requestTimeoutMs, remainingTimeMs)
    );

    try {
      return await this.fetchWithKeepaliveRetry(
        url,
        {
          ...requestInit,
          signal: attemptController.signal,
        },
        bodySize,
        configuredKeepalive,
        disableKeepalive
      );
    } catch (err) {
      if (timedOut) {
        throw new RequestTimeoutError(err);
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
      callerSignal?.removeEventListener('abort', abortFromCaller);
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
    const remainingTimeMs = this.retryOptions.maxElapsedTimeMs - elapsedTimeMs;

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
    const remainingAfterWaitMs = this.retryOptions.maxElapsedTimeMs - elapsedAfterWaitMs;
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
    const backoffMs = Math.min(
      this.retryOptions.initialBackoffMs * this.retryOptions.backoffMultiplier ** (attempt - 1),
      this.retryOptions.maxBackoffMs
    );
    const jitteredBackoffMs = backoffMs * (0.8 + Math.random() * 0.4);

    return Math.min(jitteredBackoffMs, this.retryOptions.maxBackoffMs);
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

    let day: number;
    let month: number;
    let year: number;
    let hour: number;
    let minute: number;
    let second: number;

    const imfFixdateMatch = IMF_FIXDATE_PATTERN.exec(retryAfterHeader);
    const rfc850Match = RFC850_DATE_PATTERN.exec(retryAfterHeader);
    const asctimeMatch = ASCTIME_DATE_PATTERN.exec(retryAfterHeader);
    if (imfFixdateMatch) {
      day = Number(imfFixdateMatch[1]);
      month = HTTP_MONTHS.indexOf(imfFixdateMatch[2]!);
      year = Number(imfFixdateMatch[3]);
      hour = Number(imfFixdateMatch[4]);
      minute = Number(imfFixdateMatch[5]);
      second = Number(imfFixdateMatch[6]);
    } else if (rfc850Match) {
      day = Number(rfc850Match[1]);
      month = HTTP_MONTHS.indexOf(rfc850Match[2]!);
      const twoDigitYear = Number(rfc850Match[3]);
      const currentYear = new Date(this.getNow()).getUTCFullYear();
      year = Math.floor(currentYear / 100) * 100 + twoDigitYear;
      if (year - currentYear > 50) {
        year -= 100;
      }
      hour = Number(rfc850Match[4]);
      minute = Number(rfc850Match[5]);
      second = Number(rfc850Match[6]);
    } else if (asctimeMatch) {
      month = HTTP_MONTHS.indexOf(asctimeMatch[1]!);
      day = Number(asctimeMatch[2]);
      hour = Number(asctimeMatch[3]);
      minute = Number(asctimeMatch[4]);
      second = Number(asctimeMatch[5]);
      year = Number(asctimeMatch[6]);
    } else {
      return undefined;
    }

    const date = Date.UTC(year, month, day, hour, minute, second);
    const parsedDate = new Date(date);
    if (
      parsedDate.getUTCFullYear() !== year ||
      parsedDate.getUTCMonth() !== month ||
      parsedDate.getUTCDate() !== day ||
      parsedDate.getUTCHours() !== hour ||
      parsedDate.getUTCMinutes() !== minute ||
      parsedDate.getUTCSeconds() !== second
    ) {
      return undefined;
    }

    return Math.max(0, date - this.getNow());
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
    const disabledUntil = new Date(
      this.getNow() + (this.getRetryAfterDelayMs(response) ?? this.rateLimitBackoffMs)
    );
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
