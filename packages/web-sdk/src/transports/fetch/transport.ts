import { BaseExtension, BaseTransport, createPromiseBuffer, getTransportBody, noop, VERSION } from '@grafana/faro-core';
import type { Config, Patterns, PromiseBuffer, TransportItem } from '@grafana/faro-core';

import { getSessionManagerByConfig } from '../../instrumentations/session/sessionManager';
import { getUserSessionUpdater } from '../../instrumentations/session/sessionManager/sessionManagerUtils';

import type { FetchTransportOptions } from './types';
import { getWorkerScript } from './workerScript';

const DEFAULT_BUFFER_SIZE = 30;
const DEFAULT_CONCURRENCY = 5; // chrome supports 10 total, firefox 17
const DEFAULT_RATE_LIMIT_BACKOFF_MS = 5000;

const BEACON_BODY_SIZE_LIMIT = 60000;
const TOO_MANY_REQUESTS = 429;
const ACCEPTED = 202;

interface PendingWorkerRequest {
  resolve: (value: Response | void) => void;
  reject: (reason: unknown) => void;
}

interface WorkerMessage {
  type: 'send-result' | 'rate-limited' | 'send-error';
  id: number;
  sessionExpired?: boolean;
  disabledUntil?: number;
  error?: string;
}

export class FetchTransport extends BaseTransport {
  readonly name = '@grafana/faro-web-sdk:transport-fetch';
  readonly version = VERSION;

  promiseBuffer: PromiseBuffer<Response | void>;

  private readonly rateLimitBackoffMs: number;
  private readonly getNow: () => number;
  private readonly compressionEnabled: boolean;
  private disabledUntil: Date = new Date(0);

  private worker: Worker | null = null;
  private nextMessageId = 0;
  private pendingWorkerRequests = new Map<number, PendingWorkerRequest>();

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

    this.initWorker();
  }

  private initWorker(): void {
    if (this.options.disableWorker) {
      return;
    }

    try {
      if (typeof Worker === 'undefined') {
        return;
      }

      const blob = new Blob([getWorkerScript()], { type: 'application/javascript' });
      const blobUrl = URL.createObjectURL(blob);
      this.worker = new Worker(blobUrl);
      URL.revokeObjectURL(blobUrl);

      this.worker.onmessage = (e: MessageEvent<WorkerMessage>) => this.handleWorkerMessage(e.data);
      this.worker.onerror = () => this.handleWorkerError();
    } catch {
      this.worker = null;
      this.logWarn(
        'Faro transport Worker could not be created — falling back to main-thread transport. ' +
          'If your site uses a Content-Security-Policy, add "worker-src \'self\' blob:;" to enable the Worker transport.'
      );
    }
  }

  private handleWorkerMessage(data: WorkerMessage): void {
    const pending = this.pendingWorkerRequests.get(data.id);
    if (!pending) {
      return;
    }
    this.pendingWorkerRequests.delete(data.id);

    try {
      switch (data.type) {
        case 'send-result':
          if (data.sessionExpired) {
            this.extendFaroSession(this.config, this.logDebug);
          }
          break;

        case 'rate-limited':
          if (data.disabledUntil != null) {
            this.disabledUntil = new Date(data.disabledUntil);
            this.logWarn(`Too many requests, backing off until ${this.disabledUntil}`);
          }
          break;

        case 'send-error':
          this.logError('Worker transport failed:', data.error);
          break;
      }
    } finally {
      pending.resolve(undefined);
    }
  }

  private handleWorkerError(): void {
    this.logWarn('Faro transport Worker crashed — falling back to main-thread transport.');

    const error = new Error('Worker terminated');
    for (const [, pending] of this.pendingWorkerRequests) {
      pending.reject(error);
    }
    this.pendingWorkerRequests.clear();
    this.worker?.terminate();
    this.worker = null;
  }

  async send(items: TransportItem[]): Promise<void> {
    try {
      if (this.disabledUntil > new Date(this.getNow())) {
        this.logWarn(`Dropping transport item due to too many requests. Backoff until ${this.disabledUntil}`);
        return;
      }

      // Use worker when available and page is visible.
      // When the page is hidden (visibilitychange flush), send directly
      // so keepalive/sendBeacon can deliver before the page dies.
      // Also bypass when an AbortSignal is present since it can't be cloned to a worker.
      const hasSignal = !!(this.options.requestOptions as RequestInit | undefined)?.signal;
      if (this.worker && document.visibilityState !== 'hidden' && !hasSignal) {
        try {
          return await this.sendViaWorker(items);
        } catch {
          // Worker path failed — fall through to direct send
        }
      }

      return await this.sendDirect(items);
    } catch (err) {
      this.logError(err);
    }
  }

  private async sendViaWorker(items: TransportItem[]): Promise<void> {
    if (!this.worker) {
      throw new Error('Worker not available');
    }

    await this.promiseBuffer.add(async () => {
      const worker = this.worker;
      if (!worker) {
        throw new Error('Worker terminated while queued');
      }

      const { requestOptions, apiKey } = this.options;
      const url = new URL(this.options.url, document.baseURI).href;
      const { headers = {}, ...restOfRequestOptions } = requestOptions ?? {};

      const resolvedHeaders: Record<string, string> = {};
      for (const [key, value] of Object.entries(headers)) {
        resolvedHeaders[key] = typeof value === 'function' ? await Promise.resolve(value()) : value;
      }

      let sessionId: string | undefined;
      const sessionMeta = this.metas.value.session;
      if (sessionMeta != null) {
        sessionId = sessionMeta.id;
      }

      return new Promise<void>((resolve, reject) => {
        const id = this.nextMessageId++;
        this.pendingWorkerRequests.set(id, {
          resolve: resolve as (value: Response | void) => void,
          reject,
        });

        try {
          worker.postMessage({
            type: 'send',
            id,
            items,
            url,
            apiKey,
            headers: resolvedHeaders,
            sessionId,
            requestOptions: restOfRequestOptions,
            rateLimitBackoffMs: this.rateLimitBackoffMs,
          });
        } catch (err) {
          this.pendingWorkerRequests.delete(id);
          reject(err);
        }
      });
    });
  }

  private async sendDirect(items: TransportItem[]): Promise<void> {
    await this.promiseBuffer.add(async () => {
      const jsonBody = JSON.stringify(getTransportBody(items));

      const { url, requestOptions, apiKey } = this.options;

      const { headers = {}, ...restOfRequestOptions } = requestOptions ?? {};

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
      let bodySize = jsonBody.length;
      const compressionHeaders: Record<string, string> = {};

      if (this.compressionEnabled) {
        body = await this.compress(jsonBody);
        bodySize = body.size;
        compressionHeaders['Content-Encoding'] = 'gzip';
      }

      return fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...compressionHeaders,
          ...resolvedHeaders,
          ...(apiKey ? { 'x-api-key': apiKey } : {}),
          ...(sessionId ? { 'x-faro-session-id': sessionId } : {}),
        },
        body,
        keepalive: bodySize <= BEACON_BODY_SIZE_LIMIT,
        ...(restOfRequestOptions ?? {}),
      })
        .then(async (response) => {
          if (response.status === ACCEPTED) {
            const sessionExpired = response.headers.get('X-Faro-Session-Status') === 'invalid';

            if (sessionExpired) {
              this.extendFaroSession(this.config, this.logDebug);
            }
          }

          if (response.status === TOO_MANY_REQUESTS) {
            this.disabledUntil = this.getRetryAfterDate(response);
            this.logWarn(`Too many requests, backing off until ${this.disabledUntil}`);
          }

          // read the body so the connection can be closed
          response.text().catch(noop);
          return response;
        })
        .catch((err) => {
          this.logError('Failed sending payload to the receiver\n', JSON.parse(jsonBody), err);
        });
    });
  }

  override getIgnoreUrls(): Patterns {
    return ([this.options.url] as Patterns).concat(this.config.ignoreUrls ?? []);
  }

  override isBatched(): boolean {
    return true;
  }

  private getRetryAfterDate(response: Response): Date {
    const now = this.getNow();
    const retryAfterHeader = response.headers.get('Retry-After');

    if (retryAfterHeader) {
      const delay = Number(retryAfterHeader);

      if (!isNaN(delay)) {
        return new Date(delay * 1000 + now);
      }

      const date = Date.parse(retryAfterHeader);

      if (!isNaN(date)) {
        return new Date(date);
      }
    }

    return new Date(now + this.rateLimitBackoffMs);
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
