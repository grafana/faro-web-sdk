import { BaseExtension, BaseTransport, createPromiseBuffer, getTransportBody, noop, VERSION } from '@grafana/faro-core';
import type { Config, Patterns, PromiseBuffer, TransportItem } from '@grafana/faro-core';

import { getSessionManagerByConfig } from '../../instrumentations/session/sessionManager';
import { getUserSessionUpdater } from '../../instrumentations/session/sessionManager/sessionManagerUtils';

import type { FetchTransportOptions } from './types';

const DEFAULT_BUFFER_SIZE = 30;
const DEFAULT_CONCURRENCY = 5; // chrome supports 10 total, firefox 17
const DEFAULT_RATE_LIMIT_BACKOFF_MS = 5000;

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

export class FetchTransport extends BaseTransport {
  readonly name = '@grafana/faro-web-sdk:transport-fetch';
  readonly version = VERSION;

  promiseBuffer: PromiseBuffer<Response | void>;

  private readonly rateLimitBackoffMs: number;
  private readonly getNow: () => number;
  private readonly compressionEnabled: boolean;
  private disabledUntil: Date = new Date(0);

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

      await this.promiseBuffer.add(async () => {
        const jsonBody = JSON.stringify(getTransportBody(items));

        const { url, requestOptions, apiKey } = this.options;

        const { headers = {}, ...restOfRequestOptions } = requestOptions ?? {};
        const { keepalive: configuredKeepalive, ...requestOptionsWithoutKeepalive } = restOfRequestOptions;

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

        return this.fetchWithKeepaliveRetry(url, requestInit, bodySize, configuredKeepalive).catch((err) => {
          this.logError('Failed sending payload to the receiver\n', JSON.parse(jsonBody), err);
        });
      });
    } catch (err) {
      this.logError(err);
    }
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
    configuredKeepalive?: boolean
  ): Promise<Response> {
    const keepaliveReservation = this.reserveKeepalive(bodySize, configuredKeepalive);

    try {
      const response = await fetch(url, {
        ...requestInit,
        keepalive: keepaliveReservation.keepalive,
      });

      return this.handleResponse(response);
    } catch (err) {
      if (keepaliveReservation.keepalive && this.isFetchNetworkError(err)) {
        this.logDebug('Retrying failed keepalive request with keepalive disabled.');

        const response = await fetch(url, {
          ...requestInit,
          keepalive: false,
        });

        return this.handleResponse(response);
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

    if (response.status === TOO_MANY_REQUESTS) {
      this.disabledUntil = this.getRetryAfterDate(response);
      this.logWarn(`Too many requests, backing off until ${this.disabledUntil}`);
    }

    // read the body so the connection can be closed
    response.text().catch(noop);
    return response;
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
