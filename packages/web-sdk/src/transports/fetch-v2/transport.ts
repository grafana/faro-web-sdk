import { BaseExtension, BaseTransport, genShortID, getTransportBody, noop, VERSION } from '@grafana/faro-core';
import type { Config, Patterns, TransportItem } from '@grafana/faro-core';

import { getSessionManagerByConfig } from '../../instrumentations/session/sessionManager';
import { getUserSessionUpdater } from '../../instrumentations/session/sessionManager/sessionManagerUtils';

import { ReliableDeliveryQueue } from './deliveryQueue';
import type { AttemptOutcome, DeliveryFailure } from './deliveryQueue';
import type { FetchTransportOptions } from './types';

const DEFAULT_BUFFER_SIZE = 30;
const DEFAULT_CONCURRENCY = 5;
const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_INITIAL_BACKOFF_MS = 1000;
const DEFAULT_MAX_BACKOFF_MS = 30000;
const DEFAULT_BACKOFF_MULTIPLIER = 2;
const DEFAULT_REQUEST_TIMEOUT_MS = 10000;
const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);
const WAIT_INTERVAL_STATUS_CODES = new Set([429, 503]);
const BEACON_BODY_SIZE_LIMIT = 60000;
const MAX_KEEPALIVE_REQUESTS = 9;
const ACCEPTED = 202;

let pendingKeepaliveBodySize = 0;
let pendingKeepaliveRequests = 0;

interface KeepaliveReservation {
  keepalive: boolean;
  release: () => void;
}
class RequestTimeoutError extends Error {}

function getBodyByteSize(body: string): number {
  return typeof TextEncoder === 'undefined' ? body.length : new TextEncoder().encode(body).byteLength;
}

export class FetchTransport extends BaseTransport {
  readonly name = '@grafana/faro-web-sdk:transport-fetch-v2';
  readonly version: string = VERSION;

  private readonly getNow: () => number;
  private readonly requestTimeoutMs: number;
  private readonly compressionEnabled: boolean;
  private readonly deliveryQueue: ReliableDeliveryQueue;

  constructor(private readonly options: FetchTransportOptions) {
    super();

    this.getNow = options.getNow ?? Date.now;
    this.requestTimeoutMs = options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
    this.compressionEnabled = (options.requestCompression ?? false) && typeof CompressionStream !== 'undefined';

    if (options.requestCompression && !this.compressionEnabled) {
      this.logWarn(
        'requestCompression is enabled but CompressionStream is not available. Falling back to uncompressed.'
      );
    }
    if (this.requestTimeoutMs > 0 && typeof AbortController === 'undefined') {
      this.logWarn('AbortController is unavailable. Requests will be sent without the configured timeout.');
    }

    this.deliveryQueue = new ReliableDeliveryQueue({
      bufferSize: options.bufferSize ?? DEFAULT_BUFFER_SIZE,
      concurrency: options.concurrency ?? DEFAULT_CONCURRENCY,
      retry: {
        maxAttempts: options.retry?.maxAttempts ?? DEFAULT_MAX_ATTEMPTS,
        initialBackoffMs: options.retry?.initialBackoffMs ?? DEFAULT_INITIAL_BACKOFF_MS,
        maxBackoffMs: options.retry?.maxBackoffMs ?? DEFAULT_MAX_BACKOFF_MS,
        backoffMultiplier: options.retry?.backoffMultiplier ?? DEFAULT_BACKOFF_MULTIPLIER,
      },
      getNow: this.getNow,
      getRandom: options.getRandom ?? Math.random,
      onRetry: (delayMs, nextAttempt) => {
        this.logDebug(`Retrying failed request after ${delayMs}ms. Attempt ${nextAttempt}.`);
      },
    });

    if (typeof window !== 'undefined') {
      window.addEventListener('pagehide', () => this.deliveryQueue.flush());
    }
  }

  async send(items: TransportItem[]): Promise<void> {
    const reservation = this.deliveryQueue.reserve();
    if (!reservation) {
      this.logError('Permanent delivery failure', {
        error: 'Reliable delivery queue is full',
        attempts: 0,
        elapsedTimeMs: 0,
      });
      return;
    }

    try {
      const prepared = await this.prepareRequest(items);
      const outcome = await reservation.deliver((_attempt, unloading) => this.performAttempt(prepared, unloading));
      if (outcome.kind === 'terminal') {
        this.logError(
          outcome.reason === 'retries-exhausted' ? 'Delivery retries exhausted' : 'Permanent delivery failure',
          {
            ...outcome.failure,
            attempts: outcome.attempts,
            elapsedTimeMs: outcome.elapsedTimeMs,
          }
        );
      }
    } catch (error) {
      reservation.release();
      this.logError('Permanent delivery failure', { error, attempts: 0, elapsedTimeMs: 0 });
    }
  }

  override getIgnoreUrls(): Patterns {
    return ([this.options.url] as Patterns).concat(this.config.ignoreUrls ?? []);
  }

  override isBatched(): boolean {
    return true;
  }

  private async prepareRequest(items: TransportItem[]): Promise<{ requestInit: RequestInit; bodySize: number }> {
    const jsonBody = JSON.stringify(getTransportBody(items));
    const { headers = {}, ...requestOptions } = this.options.requestOptions ?? {};
    const { keepalive: _keepalive, signal: _signal, ...requestOptionsWithoutManagedFields } = requestOptions;
    const resolvedHeaders: Record<string, string> = {};

    for (const [key, value] of Object.entries(headers)) {
      resolvedHeaders[key] = typeof value === 'function' ? await value() : value;
    }

    let body: string | Blob = jsonBody;
    let bodySize = getBodyByteSize(jsonBody);
    const compressionHeaders: Record<string, string> = {};
    if (this.compressionEnabled) {
      body = await this.compress(jsonBody);
      bodySize = body.size;
      compressionHeaders['Content-Encoding'] = 'gzip';
    }

    const sessionId = this.metas.value.session?.id;
    return {
      bodySize,
      requestInit: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...compressionHeaders,
          ...resolvedHeaders,
          ...(this.options.apiKey ? { 'x-api-key': this.options.apiKey } : {}),
          ...(sessionId ? { 'x-faro-session-id': sessionId } : {}),
          // Unlike dynamic headers, this key is generated once and must remain stable across attempts.
          'Idempotency-Key': genShortID(20),
        },
        body,
        ...requestOptionsWithoutManagedFields,
      },
    };
  }

  private async performAttempt(
    prepared: { requestInit: RequestInit; bodySize: number },
    unloading: boolean
  ): Promise<AttemptOutcome> {
    const callerSignal = this.options.requestOptions?.signal;
    if (callerSignal?.aborted) {
      return { kind: 'terminal', failure: { error: callerSignal.reason }, attempted: false };
    }

    try {
      const response = await this.fetchWithKeepaliveFallback(
        prepared.requestInit,
        prepared.bodySize,
        unloading ? true : this.options.requestOptions?.keepalive
      );
      this.handleResponse(response);

      if (response.status >= 200 && response.status < 300) {
        return { kind: 'success' };
      }

      const failure = { status: response.status };
      if (!RETRYABLE_STATUS_CODES.has(response.status) || unloading) {
        return { kind: 'terminal', failure };
      }

      return {
        kind: 'retry',
        failure,
        retryAfterMs: WAIT_INTERVAL_STATUS_CODES.has(response.status) ? this.getRetryAfterDelayMs(response) : undefined,
      };
    } catch (error) {
      const failure: DeliveryFailure = { error };
      if (callerSignal?.aborted || !this.isFetchNetworkError(error) || unloading) {
        return { kind: 'terminal', failure };
      }
      return { kind: 'retry', failure };
    }
  }

  private async fetchWithKeepaliveFallback(
    requestInit: RequestInit,
    bodySize: number,
    configuredKeepalive?: boolean
  ): Promise<Response> {
    const startedAt = this.getNow();
    const reservation = this.reserveKeepalive(bodySize, configuredKeepalive);
    try {
      return await this.fetchWithTimeout({ ...requestInit, keepalive: reservation.keepalive }, this.requestTimeoutMs);
    } catch (error) {
      if (
        reservation.keepalive &&
        this.isFetchNetworkError(error) &&
        !(error instanceof RequestTimeoutError) &&
        !this.options.requestOptions?.signal?.aborted
      ) {
        this.logDebug('Retrying failed keepalive request with keepalive disabled.');
        const remainingTimeoutMs = this.requestTimeoutMs - (this.getNow() - startedAt);
        return this.fetchWithTimeout({ ...requestInit, keepalive: false }, remainingTimeoutMs);
      }
      throw error;
    } finally {
      reservation.release();
    }
  }

  private async fetchWithTimeout(requestInit: RequestInit, timeoutMs: number): Promise<Response> {
    const callerSignal = this.options.requestOptions?.signal;
    if (this.requestTimeoutMs <= 0 || typeof AbortController === 'undefined') {
      return fetch(this.options.url, { ...requestInit, signal: callerSignal });
    }
    if (timeoutMs <= 0) {
      throw new RequestTimeoutError('Request timed out');
    }

    const controller = new AbortController();
    const abortFromCaller = () => controller.abort(callerSignal?.reason);
    callerSignal?.addEventListener('abort', abortFromCaller, { once: true });
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);

    try {
      return await fetch(this.options.url, { ...requestInit, signal: controller.signal });
    } catch (error) {
      if (timedOut && !callerSignal?.aborted) {
        throw new RequestTimeoutError('Request timed out');
      }
      throw error;
    } finally {
      clearTimeout(timeout);
      callerSignal?.removeEventListener('abort', abortFromCaller);
    }
  }

  private getRetryAfterDelayMs(response: Response): number | undefined {
    const value = response.headers.get('Retry-After')?.trim();
    if (!value) {
      return undefined;
    }
    if (/^\d+$/.test(value)) {
      const delay = Number(value) * 1000;
      return Number.isFinite(delay) ? delay : undefined;
    }
    const retryAt = Date.parse(value);
    return Number.isNaN(retryAt) ? undefined : Math.max(0, retryAt - this.getNow());
  }

  private reserveKeepalive(bodySize: number, configuredKeepalive?: boolean): KeepaliveReservation {
    if (
      configuredKeepalive === false ||
      bodySize > BEACON_BODY_SIZE_LIMIT ||
      pendingKeepaliveBodySize + bodySize > BEACON_BODY_SIZE_LIMIT ||
      pendingKeepaliveRequests >= MAX_KEEPALIVE_REQUESTS
    ) {
      return { keepalive: false, release: noop };
    }

    pendingKeepaliveBodySize += bodySize;
    pendingKeepaliveRequests++;
    let released = false;
    return {
      keepalive: true,
      release: () => {
        if (!released) {
          released = true;
          pendingKeepaliveBodySize -= bodySize;
          pendingKeepaliveRequests--;
        }
      },
    };
  }

  private handleResponse(response: Response): void {
    if (response.status === ACCEPTED && response.headers.get('X-Faro-Session-Status') === 'invalid') {
      this.extendFaroSession(this.config, this.logDebug.bind(this));
    }
    response.text().catch(noop);
  }

  private isFetchNetworkError(error: unknown): boolean {
    return (
      error instanceof TypeError ||
      error instanceof RequestTimeoutError ||
      (error instanceof DOMException && error.name === 'AbortError')
    );
  }

  private async compress(body: string): Promise<Blob> {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(body));
        controller.close();
      },
    }).pipeThrough(new CompressionStream('gzip'));
    const chunks: BlobPart[] = [];
    const reader = stream.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        return new Blob(chunks);
      }
      chunks.push(value);
    }
  }

  private extendFaroSession(config: Config, logDebug: BaseExtension['logDebug']): void {
    const sessionTrackingConfig = config.sessionTracking;
    if (sessionTrackingConfig?.enabled) {
      const { fetchUserSession, storeUserSession } = getSessionManagerByConfig(sessionTrackingConfig);
      getUserSessionUpdater({ fetchUserSession, storeUserSession })({ forceSessionExtend: true });
      logDebug('Session expired created new session.');
    } else {
      logDebug('Session expired.');
    }
  }
}
