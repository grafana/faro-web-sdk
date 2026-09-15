import { BaseTransport, createPromiseBuffer, genShortID, getTransportBody, noop, VERSION } from '@grafana/faro-core';
import type { Patterns, PromiseBuffer, PromiseProducer, TransportItem } from '@grafana/faro-core';

import { getSessionManagerByConfig } from '../../instrumentations/session/sessionManager';
import { getUserSessionUpdater } from '../../instrumentations/session/sessionManager/sessionManagerUtils';
import { parseHttpDate } from '../../utils/httpDate';

import { ReliableDeliveryQueue } from './deliveryQueue';
import type { AttemptOutcome, DeliveryFailure, DeliveryReservation } from './deliveryQueue';
import { SendDeadline } from './sendDeadline';
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

interface PreparedRequest {
  requestInit: RequestInit;
  bodySize: number;
  sessionId: string | undefined;
  keepalive: boolean | undefined;
}

function getBodyByteSize(body: string): number {
  return typeof TextEncoder === 'undefined' ? body.length : new TextEncoder().encode(body).byteLength;
}

export class FetchTransport extends BaseTransport {
  readonly name = '@grafana/faro-web-sdk:transport-fetch';
  readonly version: string = VERSION;

  /** Compatibility access to the transport's bounded task queue. Tasks added directly are not retried. */
  promiseBuffer: PromiseBuffer<Response | void>;

  private readonly defaultPromiseBuffer: PromiseBuffer<Response | void>;
  private readonly defaultBufferAdd: PromiseBuffer<Response | void>['add'];
  private readonly customPromiseBuffer: PromiseBuffer<Response | void>;
  private pendingCustomSends = 0;
  private readonly getNow: () => number;
  private readonly requestTimeoutMs: number;
  private readonly compressionEnabled: boolean;
  private readonly deliveryQueue: ReliableDeliveryQueue;
  private removeLifecycleListeners?: () => void;

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

    this.deliveryQueue = new ReliableDeliveryQueue({
      bufferSize: options.bufferSize ?? DEFAULT_BUFFER_SIZE,
      concurrency: options.concurrency ?? DEFAULT_CONCURRENCY,
      retry: {
        maxAttempts: options.retry?.maxAttempts ?? DEFAULT_MAX_ATTEMPTS,
        initialBackoffMs:
          options.retry?.initialBackoffMs ?? options.defaultRateLimitBackoffMs ?? DEFAULT_INITIAL_BACKOFF_MS,
        maxBackoffMs: options.retry?.maxBackoffMs ?? DEFAULT_MAX_BACKOFF_MS,
        backoffMultiplier: options.retry?.backoffMultiplier ?? DEFAULT_BACKOFF_MULTIPLIER,
      },
      getNow: this.getNow,
      getRandom: options.getRandom ?? Math.random,
      onRetry: (delayMs, nextAttempt) => {
        this.logDebug(`Retrying failed request after ${delayMs}ms. Attempt ${nextAttempt}.`);
      },
    });

    this.customPromiseBuffer = createPromiseBuffer({
      size: options.bufferSize ?? DEFAULT_BUFFER_SIZE,
      concurrency: options.concurrency ?? DEFAULT_CONCURRENCY,
    });
    this.defaultPromiseBuffer = {
      add: (producer) => {
        // A replacement may wrap or asynchronously forward a producer through
        // the original buffer. Keep that outer scheduling separate from the
        // delivery workers it awaits, so a one-worker buffer cannot deadlock.
        if (
          this.promiseBuffer !== this.defaultPromiseBuffer ||
          this.promiseBuffer.add !== this.defaultBufferAdd ||
          this.pendingCustomSends > 0
        ) {
          return this.customPromiseBuffer.add(async () => producer());
        }
        const reservation = this.deliveryQueue.reserve();
        if (!reservation) {
          throw new Error('Task buffer full');
        }
        return this.runBufferedTask(reservation, producer);
      },
    };
    this.defaultBufferAdd = this.defaultPromiseBuffer.add;
    this.promiseBuffer = this.defaultPromiseBuffer;

    // Derived initialization hooks run after their constructor and SDK wiring.
    FetchTransport.prototype.initialize.call(this);
  }

  initialize(): void {
    if (this.removeLifecycleListeners || typeof window === 'undefined') {
      return;
    }
    let active = true;
    const onPageHide = () => {
      if (active) {
        this.deliveryQueue.flush();
      }
    };
    const onPageShow = (event: PageTransitionEvent) => {
      if (active && event.persisted) {
        this.deliveryQueue.resume();
      }
    };
    const dispose = () => {
      active = false;
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('pageshow', onPageShow);
    };
    this.removeLifecycleListeners = dispose;
    try {
      window.addEventListener('pagehide', onPageHide);
      window.addEventListener('pageshow', onPageShow);
      if (this.removeLifecycleListeners !== dispose) {
        dispose();
        return;
      }
      this.deliveryQueue.resume();
    } catch (error) {
      if (this.removeLifecycleListeners === dispose) {
        this.removeLifecycleListeners = undefined;
      }
      dispose();
      throw error;
    }
  }

  destroy(): void {
    const dispose = this.removeLifecycleListeners;
    this.removeLifecycleListeners = undefined;
    dispose?.();
  }

  async send(items: TransportItem[]): Promise<void> {
    const startedAt = this.getNow();
    const reservation = this.deliveryQueue.reserve();
    if (!reservation) {
      this.logError('Permanent delivery failure', {
        error: 'Reliable delivery queue is full',
        attempts: 0,
        elapsedTimeMs: 0,
      });
      return;
    }

    let deadline: SendDeadline | undefined;
    let custom = false;
    let attempts = 0;
    try {
      const task = new SendDeadline(
        startedAt,
        this.requestTimeoutMs,
        this.getNow,
        this.options.requestOptions?.signal ?? undefined
      );
      deadline = task;
      const buffer = this.promiseBuffer;
      custom = buffer !== this.defaultPromiseBuffer || buffer.add !== this.defaultBufferAdd;
      let work: Promise<void> | undefined;
      const produce = () => {
        if (!work) {
          work = Promise.resolve().then(() =>
            this.deliver(items, reservation, task, () => {
              attempts++;
            })
          );
          void work.catch(noop);
        }
        return work;
      };
      if (custom) {
        this.pendingCustomSends++;
        await task.run(() => buffer.add(produce));
      } else {
        await task.run(produce);
      }
    } catch (error) {
      this.logError('Permanent delivery failure', { error, attempts, elapsedTimeMs: this.getNow() - startedAt });
    } finally {
      try {
        deadline?.dispose();
      } finally {
        reservation.release();
        if (custom) {
          this.pendingCustomSends--;
        }
      }
    }
  }

  private async runBufferedTask(
    reservation: DeliveryReservation,
    producer: PromiseProducer<Response | void>
  ): Promise<Response | void> {
    let result: Response | void = undefined;
    try {
      await reservation.deliver(async () => {
        result = await producer();
        return { kind: 'success', attemptsMade: 1 };
      });
      return result;
    } finally {
      reservation.release();
    }
  }

  private async deliver(
    items: TransportItem[],
    reservation: DeliveryReservation,
    deadline: SendDeadline,
    onFetch: () => void
  ): Promise<void> {
    const prepared = await deadline.run(() => this.prepareRequest(items, deadline));
    const outcome = await deadline.run(() =>
      reservation.deliver((attemptsRemaining, unloading) =>
        this.performAttempt(prepared, deadline, attemptsRemaining, unloading, onFetch)
      )
    );
    if (outcome.kind === 'terminal') {
      this.logError(
        outcome.reason === 'retries-exhausted' ? 'Delivery retries exhausted' : 'Permanent delivery failure',
        {
          ...outcome.failure,
          reason: outcome.reason,
          attempts: outcome.attempts,
          elapsedTimeMs: this.getNow() - deadline.startedAt,
        }
      );
    }
  }

  override getIgnoreUrls(): Patterns {
    return ([this.options.url] as Patterns).concat(this.config.ignoreUrls ?? []);
  }

  override isBatched(): boolean {
    return true;
  }

  private async prepareRequest(items: TransportItem[], deadline: SendDeadline): Promise<PreparedRequest> {
    // Async headers and compression can outlive a session. Bind both the header
    // and its response handling to the payload, not the current session.
    const transportBody = getTransportBody(items);
    const sessionId = transportBody.meta.session?.id;
    const jsonBody = JSON.stringify(transportBody);
    deadline.assertActive();

    const { headers = {}, ...requestOptions } = this.options.requestOptions ?? {};
    const { keepalive, signal: _signal, ...requestOptionsWithoutManagedFields } = requestOptions;
    const resolvedHeaders: Record<string, string> = {};

    for (const key of Object.keys(headers)) {
      deadline.assertActive();
      if (key.toLowerCase() === 'idempotency-key' || key.toLowerCase() === 'x-faro-session-id') {
        continue;
      }
      const value = headers[key]!;
      resolvedHeaders[key] = typeof value === 'function' ? await deadline.run(value) : value;
    }

    deadline.assertActive();
    let body: string | Blob = jsonBody;
    let bodySize = getBodyByteSize(jsonBody);
    const compressionHeaders: Record<string, string> = {};
    if (this.compressionEnabled) {
      body = await deadline.run(() => this.compress(jsonBody, deadline));
      bodySize = body.size;
      compressionHeaders['Content-Encoding'] = 'gzip';
    }

    return {
      bodySize,
      sessionId,
      keepalive,
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
    prepared: PreparedRequest,
    deadline: SendDeadline,
    attemptsRemaining: number,
    unloading: boolean,
    onFetch: () => void
  ): Promise<AttemptOutcome> {
    deadline.assertActive();
    let attemptsMade = 0;
    let response: Response;
    try {
      response = await this.fetchWithKeepaliveFallback(
        prepared.requestInit,
        prepared.bodySize,
        unloading ? true : prepared.keepalive,
        attemptsRemaining,
        deadline,
        () => {
          attemptsMade++;
          onFetch();
        }
      );
    } catch (error) {
      deadline.assertActive();
      const failure: DeliveryFailure = { error };
      if (!this.isFetchNetworkError(error) || unloading) {
        return { kind: 'terminal', failure, attemptsMade };
      }
      return { kind: 'retry', failure, attemptsMade };
    }

    deadline.assertActive();
    try {
      this.handleResponse(response, prepared.sessionId, deadline);
    } catch (error) {
      deadline.assertActive();
      this.logError('Failed to process collector response', error);
    }
    deadline.assertActive();
    if (response.status >= 200 && response.status < 300) {
      return { kind: 'success', attemptsMade };
    }

    const failure = { status: response.status };
    if (!RETRYABLE_STATUS_CODES.has(response.status) || unloading) {
      return { kind: 'terminal', failure, attemptsMade };
    }
    return {
      kind: 'retry',
      failure,
      attemptsMade,
      retryAfterMs: WAIT_INTERVAL_STATUS_CODES.has(response.status) ? this.getRetryAfterDelayMs(response) : undefined,
    };
  }

  private async fetchWithKeepaliveFallback(
    requestInit: RequestInit,
    bodySize: number,
    configuredKeepalive: boolean | undefined,
    attemptsRemaining: number,
    deadline: SendDeadline,
    onFetch: () => void
  ): Promise<Response> {
    const reservation = this.reserveKeepalive(bodySize, configuredKeepalive);
    try {
      return await deadline.run(() => {
        onFetch();
        return fetch(this.options.url, { ...requestInit, keepalive: reservation.keepalive, signal: deadline.signal });
      });
    } catch (error) {
      deadline.assertActive();
      if (reservation.keepalive && attemptsRemaining > 1 && this.isFetchNetworkError(error)) {
        this.logDebug('Retrying failed keepalive request with keepalive disabled.');
        return deadline.run(() => {
          onFetch();
          return fetch(this.options.url, { ...requestInit, keepalive: false, signal: deadline.signal });
        });
      }
      throw error;
    } finally {
      reservation.release();
    }
  }

  private getRetryAfterDelayMs(response: Response): number | undefined {
    const value = response.headers.get('Retry-After');
    if (!value) {
      return undefined;
    }
    if (/^\d+$/.test(value)) {
      const delay = Number(value) * 1000;
      return Number.isFinite(delay) ? delay : Number.POSITIVE_INFINITY;
    }
    const now = this.getNow();
    const retryAt = parseHttpDate(value, now);
    return retryAt == null ? undefined : Math.max(0, retryAt - now);
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

  private handleResponse(response: Response, requestSessionId: string | undefined, deadline: SendDeadline): void {
    try {
      const invalid = response.status === ACCEPTED && response.headers.get('X-Faro-Session-Status') === 'invalid';
      deadline.assertActive();
      if (invalid) {
        this.extendFaroSession(requestSessionId, deadline);
      }
    } finally {
      response.text().catch(noop);
    }
  }

  private isFetchNetworkError(error: unknown): boolean {
    return error instanceof TypeError || (error instanceof DOMException && error.name === 'AbortError');
  }

  private async compress(body: string, deadline: SendDeadline): Promise<Blob> {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(body));
        controller.close();
      },
    }).pipeThrough(new CompressionStream('gzip'));
    const chunks: BlobPart[] = [];
    const reader = stream.getReader();
    try {
      for (;;) {
        const { done, value } = await deadline.run(() => reader.read());
        if (done) {
          return new Blob(chunks);
        }
        chunks.push(value);
      }
    } finally {
      void reader.cancel().catch(noop);
      reader.releaseLock();
    }
  }

  private extendFaroSession(requestSessionId: string | undefined, deadline: SendDeadline): void {
    const sessionTrackingConfig = this.config.sessionTracking;
    if (!sessionTrackingConfig?.enabled) {
      this.logDebug('Session expired.');
      return;
    }

    const { fetchUserSession, storeUserSession } = getSessionManagerByConfig(sessionTrackingConfig);

    // A delayed response must not rotate a newer session, including one another
    // tab has already established in shared storage.
    const currentSessionId = this.metas.value.session?.id;
    if (!requestSessionId || requestSessionId !== currentSessionId) {
      this.logDebug('Ignoring stale session-invalid response; request session no longer current.');
      return;
    }

    getUserSessionUpdater({
      fetchUserSession,
      storeUserSession,
      isActive: () => {
        deadline.assertActive();
        return true;
      },
    })({ forceSessionExtend: true, expectedSessionId: requestSessionId });
    this.logDebug('Session invalidation processed.');
  }
}
