import {
  BaseExtension,
  BaseTransport,
  createPromiseBuffer,
  getTransportBody,
  noop,
  PromiseBuffer,
  VERSION,
} from '@grafana/faro-core';
import type { Config, Patterns, TransportItem } from '@grafana/faro-core';

import { getSessionManagerByConfig } from '../../instrumentations/session/sessionManager';
import { getUserSessionUpdater } from '../../instrumentations/session/sessionManager/sessionManagerUtils';

import type { FetchTransportOptions } from './types';

const DEFAULT_BUFFER_SIZE = 30;
const DEFAULT_CONCURRENCY = 5; // chrome supports 10 total, firefox 17
const DEFAULT_RATE_LIMIT_BACKOFF_MS = 5000;

const BEACON_BODY_SIZE_LIMIT = 60000;
const TOO_MANY_REQUESTS = 429;
const ACCEPTED = 202;

export class FetchTransport extends BaseTransport {
  readonly name = '@grafana/faro-react-native-sdk:transport-fetch';
  readonly version = VERSION;

  promiseBuffer: PromiseBuffer<Response | void>;

  private readonly rateLimitBackoffMs: number;
  private readonly getNow: () => number;
  private disabledUntil: Date = new Date();

  constructor(private options: FetchTransportOptions) {
    super();

    this.rateLimitBackoffMs = options.defaultRateLimitBackoffMs ?? DEFAULT_RATE_LIMIT_BACKOFF_MS;
    this.getNow = options.getNow ?? (() => Date.now());

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

      await this.promiseBuffer.add(() => {
        const body = JSON.stringify(getTransportBody(items));

        const { url, requestOptions, apiKey } = this.options;

        const { headers, ...restOfRequestOptions } = requestOptions ?? {};

        let sessionId;
        const sessionMeta = this.metas.value.session;
        if (sessionMeta != null) {
          sessionId = sessionMeta.id;
        }

        return fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(headers ?? {}),
            ...(apiKey ? { 'x-api-key': apiKey } : {}),
            ...(sessionId ? { 'x-faro-session-id': sessionId } : {}),
          },
          body,
          keepalive: body.length <= BEACON_BODY_SIZE_LIMIT,
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
            this.logError('Failed sending payload to the receiver\n', JSON.parse(body), err);
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
