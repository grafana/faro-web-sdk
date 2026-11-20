import {
  BaseExtension,
  BaseTransport,
  createPromiseBuffer,
  genShortID,
  getTransportBody,
  noop,
  VERSION,
} from '@grafana/faro-core';
import type { Config, Meta, Patterns, PromiseBuffer, PromiseProducer, TransportItem } from '@grafana/faro-core';

import { getSessionManagerByConfig } from '../../instrumentations/session/sessionManager';
import { getUserSessionUpdater } from '../../instrumentations/session/sessionManager/sessionManagerUtils';
import { parseHttpDate } from '../../utils/httpDate';

import { ReliableDeliveryQueue } from './deliveryQueue';
import type { AttemptOutcome, DeliveryFailure, DeliveryReservation } from './deliveryQueue';
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
  meta: Meta;
  sessionId: string | undefined;
  resolvedHeaders: Record<string, string>;
  /** Items copied before header callbacks run. Splits read this, not the live batch. */
  items: TransportItem[];
}
class RequestTimeoutError extends Error {}

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
          return this.customPromiseBuffer.add(producer);
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

    if (typeof window !== 'undefined') {
      window.addEventListener('pagehide', () => this.deliveryQueue.flush());
      window.addEventListener('pageshow', (event) => {
        if (event.persisted) {
          this.deliveryQueue.resume();
        }
      });
    }
  }

  async send(items: TransportItem[]): Promise<void> {
    const buffer = this.promiseBuffer;
    if (buffer === this.defaultPromiseBuffer && buffer.add === this.defaultBufferAdd) {
      await this.deliver(items);
      return;
    }

    this.pendingCustomSends++;
    try {
      await buffer.add(() => this.deliver(items));
    } catch (error) {
      this.logError('Permanent delivery failure', { error, attempts: 0, elapsedTimeMs: 0 });
    } finally {
      this.pendingCustomSends--;
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

  private async deliver(items: TransportItem[]): Promise<void> {
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
      const outcome = await reservation.deliver((attemptsRemaining, unloading, isRedelivery) =>
        unloading && !isRedelivery
          ? this.performUnloadAttempt(prepared, attemptsRemaining)
          : this.performAttempt(prepared, attemptsRemaining, unloading)
      );
      if (outcome.kind === 'terminal') {
        this.logError(
          outcome.reason === 'retries-exhausted' ? 'Delivery retries exhausted' : 'Permanent delivery failure',
          {
            ...outcome.failure,
            reason: outcome.reason,
            attempts: outcome.attempts,
            elapsedTimeMs: outcome.elapsedTimeMs,
          }
        );
      }
    } catch (error) {
      this.logError('Permanent delivery failure', { error, attempts: 0, elapsedTimeMs: 0 });
    } finally {
      reservation.release();
    }
  }

  override getIgnoreUrls(): Patterns {
    return ([this.options.url] as Patterns).concat(this.config.ignoreUrls ?? []);
  }

  override isBatched(): boolean {
    return true;
  }

  private async prepareRequest(items: TransportItem[], original?: PreparedRequest): Promise<PreparedRequest> {
    // Async headers and compression can outlive a session. Bind both the header
    // and its response handling to the payload, not the current session.
    // Copy the items first. A payload toJSON can mutate metadata while the body is built,
    // and a header callback can mutate a payload after that. Chunks read this copy.
    const sourceItems = original ? items : this.snapshotItems(items);
    const transportBody = getTransportBody(sourceItems);
    const meta: Meta = original?.meta ?? JSON.parse(JSON.stringify(transportBody.meta));
    const sessionId = meta.session?.id;
    const jsonBody = JSON.stringify({ ...transportBody, meta });

    const { headers = {}, ...requestOptions } = this.options.requestOptions ?? {};
    const { keepalive: _keepalive, signal: _signal, ...requestOptionsWithoutManagedFields } = requestOptions;
    let resolvedHeaders = original?.resolvedHeaders;
    if (!resolvedHeaders) {
      resolvedHeaders = {};
      for (const [key, value] of Object.entries(headers)) {
        resolvedHeaders[key] = typeof value === 'function' ? await value() : value;
      }
    }

    let body: string | Blob = jsonBody;
    let bodySize = getBodyByteSize(jsonBody);
    const compressionHeaders: Record<string, string> = {};
    if (this.compressionEnabled) {
      body = await this.compress(jsonBody);
      bodySize = body.size;
      compressionHeaders['Content-Encoding'] = 'gzip';
    }

    return {
      bodySize,
      meta,
      sessionId,
      resolvedHeaders,
      items: sourceItems,
      requestInit: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...compressionHeaders,
          ...resolvedHeaders,
          ...(this.options.apiKey ? { 'x-api-key': this.options.apiKey } : {}),
          ...(sessionId ? { 'x-faro-session-id': sessionId } : {}),
          // Each body gets its own key, reused across attempts.
          'Idempotency-Key': genShortID(20),
        },
        body,
        ...requestOptionsWithoutManagedFields,
      },
    };
  }

  /** Deep-copies meta before payload serialization, so a payload toJSON cannot change the captured session. */
  private snapshotItems(items: TransportItem[]): TransportItem[] {
    return items.map((item) => {
      const meta = JSON.parse(JSON.stringify(item.meta ?? {})) as Meta;
      const payloadJson = JSON.stringify(item.payload);
      const payload = (payloadJson === undefined ? item.payload : JSON.parse(payloadJson)) as TransportItem['payload'];
      return { ...item, meta, payload };
    });
  }

  /** On unload, send an over-budget batch in chunks that fit the keepalive budget. */
  private async performUnloadAttempt(prepared: PreparedRequest, attemptsRemaining: number): Promise<AttemptOutcome> {
    // Each request gets a slot of its own: this attempt's slot first, then idle ones. A request that waited
    // for a slot would only start after an earlier one finished, which is too late once the page is gone.
    const requests: Array<{ prepared: PreparedRequest; reservation: KeepaliveReservation; releaseSlot: () => void }> =
      [];
    const releaseAll = () =>
      requests.forEach(({ reservation, releaseSlot }) => {
        reservation.release();
        releaseSlot();
      });
    let chunkSlot: () => void = noop;
    try {
      let remaining = prepared.items;
      let remainingPrepared = prepared;
      for (;;) {
        let chunk = remaining;
        let chunkPrepared = remainingPrepared;
        while (
          chunk.length > 1 &&
          pendingKeepaliveRequests < MAX_KEEPALIVE_REQUESTS &&
          !this.fitsKeepaliveBudget(chunkPrepared.bodySize)
        ) {
          chunk = chunk.slice(0, Math.ceil(chunk.length / 2));
          chunkPrepared = await this.prepareRequest(chunk, prepared);
        }

        // A single item that does not fit goes on its own, and the suffix keeps splitting, when a later item
        // can still use keepalive and a slot is free. An item over the 60 KB limit always goes alone. Once
        // nothing left fits, or no slot is free, the rest stays in this request.
        const fits = this.fitsKeepaliveBudget(chunkPrepared.bodySize);
        const sendItemAlone =
          !fits &&
          chunk !== remaining &&
          chunk.length === 1 &&
          pendingKeepaliveRequests < MAX_KEEPALIVE_REQUESTS &&
          (chunkPrepared.bodySize > BEACON_BODY_SIZE_LIMIT ||
            (await this.laterItemFitsKeepalive(remaining.slice(chunk.length), prepared)));
        const nextSlot =
          chunk !== remaining && (fits || sendItemAlone) ? this.deliveryQueue.claimIdleSlot() : undefined;
        if (!nextSlot) {
          chunk = remaining;
          chunkPrepared = remainingPrepared;
        }

        // Hold the actual budget while asynchronous preparation allows other deliveries to run.
        requests.push({
          prepared: chunkPrepared,
          reservation: this.reserveKeepalive(chunkPrepared.bodySize, true),
          releaseSlot: chunkSlot,
        });
        if (!nextSlot) {
          break;
        }
        chunkSlot = nextSlot;
        remaining = remaining.slice(chunk.length);
        remainingPrepared = await this.prepareRequest(remaining, prepared);
      }
    } catch {
      // Nothing has been sent, so the original body and key are still safe to use.
      releaseAll();
      chunkSlot();
      return this.performAttempt(prepared, attemptsRemaining, true);
    }

    try {
      const outcomes = await Promise.all(
        requests.map(async ({ prepared, reservation, releaseSlot }) => {
          try {
            return await this.performAttempt(prepared, attemptsRemaining, true, reservation);
          } finally {
            releaseSlot();
          }
        })
      );

      const attemptsMade = outcomes.reduce((total, outcome) => total + outcome.attemptsMade, 0);
      for (const outcome of outcomes) {
        if (outcome.kind !== 'success') {
          return { kind: 'terminal', failure: outcome.failure, attemptsMade };
        }
      }
      return { kind: 'success', attemptsMade };
    } finally {
      releaseAll();
    }
  }

  private async performAttempt(
    prepared: PreparedRequest,
    attemptsRemaining: number,
    unloading: boolean,
    keepaliveReservation?: KeepaliveReservation
  ): Promise<AttemptOutcome> {
    const callerSignal = this.options.requestOptions?.signal;
    if (callerSignal?.aborted) {
      return { kind: 'terminal', failure: { error: callerSignal.reason }, attemptsMade: 0 };
    }

    let attemptsMade = 0;
    try {
      const response = await this.fetchWithKeepaliveFallback(
        prepared.requestInit,
        prepared.bodySize,
        unloading ? true : this.options.requestOptions?.keepalive,
        unloading,
        attemptsRemaining,
        () => attemptsMade++,
        keepaliveReservation
      );
      this.handleResponse(response, prepared.sessionId);

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
    } catch (error) {
      const failure: DeliveryFailure = { error };
      if (callerSignal?.aborted || !this.isFetchNetworkError(error) || unloading) {
        return { kind: 'terminal', failure, attemptsMade };
      }
      return { kind: 'retry', failure, attemptsMade };
    }
  }

  private async fetchWithKeepaliveFallback(
    requestInit: RequestInit,
    bodySize: number,
    configuredKeepalive: boolean | undefined,
    unloading: boolean,
    attemptsRemaining: number,
    onFetch: () => void,
    keepaliveReservation?: KeepaliveReservation
  ): Promise<Response> {
    const startedAt = this.getNow();
    const reservation = keepaliveReservation ?? this.reserveKeepalive(bodySize, configuredKeepalive);
    if (!reservation.keepalive) {
      this.warnOnUnloadWithoutKeepalive(bodySize, unloading);
    }
    try {
      return await this.fetchWithTimeout(
        { ...requestInit, keepalive: reservation.keepalive },
        this.requestTimeoutMs,
        onFetch
      );
    } catch (error) {
      if (
        reservation.keepalive &&
        attemptsRemaining > 1 &&
        this.isFetchNetworkError(error) &&
        !(error instanceof RequestTimeoutError) &&
        !this.options.requestOptions?.signal?.aborted
      ) {
        this.logDebug('Retrying failed keepalive request with keepalive disabled.');
        this.warnOnUnloadWithoutKeepalive(bodySize, unloading);
        const remainingTimeoutMs = this.requestTimeoutMs - (this.getNow() - startedAt);
        return this.fetchWithTimeout({ ...requestInit, keepalive: false }, remainingTimeoutMs, onFetch);
      }
      throw error;
    } finally {
      reservation.release();
    }
  }

  private warnOnUnloadWithoutKeepalive(bodySize: number, unloading: boolean): void {
    if (unloading) {
      this.logWarn('Sending request without keepalive during page unload. It may be cancelled with the page.', {
        bodySize,
        pendingKeepaliveBodySize,
        pendingKeepaliveRequests,
      });
    }
  }

  private async fetchWithTimeout(requestInit: RequestInit, timeoutMs: number, onFetch: () => void): Promise<Response> {
    const callerSignal = this.options.requestOptions?.signal;
    if (this.requestTimeoutMs <= 0 || typeof AbortController === 'undefined') {
      onFetch();
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
      onFetch();
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
    if (configuredKeepalive === false || !this.fitsKeepaliveBudget(bodySize)) {
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

  private fitsKeepaliveBudget(bodySize: number): boolean {
    return (
      pendingKeepaliveBodySize + bodySize <= BEACON_BODY_SIZE_LIMIT && pendingKeepaliveRequests < MAX_KEEPALIVE_REQUESTS
    );
  }

  private async laterItemFitsKeepalive(items: TransportItem[], original: PreparedRequest): Promise<boolean> {
    for (const item of items) {
      const prepared = await this.prepareRequest([item], original);
      if (this.fitsKeepaliveBudget(prepared.bodySize)) {
        return true;
      }
    }
    return false;
  }

  private handleResponse(response: Response, requestSessionId: string | undefined): void {
    if (response.status === ACCEPTED && response.headers.get('X-Faro-Session-Status') === 'invalid') {
      this.extendFaroSession(this.config, this.logDebug.bind(this), requestSessionId);
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

  private extendFaroSession(
    config: Config,
    logDebug: BaseExtension['logDebug'],
    requestSessionId: string | undefined
  ): void {
    const sessionTrackingConfig = config.sessionTracking;
    if (!sessionTrackingConfig?.enabled) {
      logDebug('Session expired.');
      return;
    }

    const { fetchUserSession, storeUserSession } = getSessionManagerByConfig(sessionTrackingConfig);

    // A delayed response must not rotate a newer session, including one another
    // tab has already established in shared storage.
    const currentSessionId = this.metas.value.session?.id;
    const storedSessionId = fetchUserSession()?.sessionId;
    if (!requestSessionId || requestSessionId !== currentSessionId || requestSessionId !== storedSessionId) {
      logDebug('Ignoring stale or cross-tab session-invalid response; request session no longer current.');
      return;
    }

    getUserSessionUpdater({ fetchUserSession, storeUserSession })({ forceSessionExtend: true });
    logDebug('Session expired; created new session.');
  }
}
