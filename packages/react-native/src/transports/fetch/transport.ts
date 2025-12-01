import { BaseExtension, BaseTransport, createPromiseBuffer, getTransportBody, VERSION } from '@grafana/faro-core';
import type { Config, Patterns, PromiseBuffer, TransportItem } from '@grafana/faro-core';

import type { FetchTransportOptions } from './types';

const DEFAULT_BUFFER_SIZE = 30;
const DEFAULT_CONCURRENCY = 5;
const DEFAULT_RATE_LIMIT_BACKOFF_MS = 5000;

const TOO_MANY_REQUESTS = 429;
const ACCEPTED = 202;

export class FetchTransport extends BaseTransport {
  readonly name = '@grafana/faro-react-native:transport-fetch';
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
      this.unpatchedConsole.log('[Faro Transport] send() called with', items.length, 'items');

      if (this.disabledUntil > new Date(this.getNow())) {
        this.logWarn(`Dropping transport item due to too many requests. Backoff until ${this.disabledUntil}`);
        this.unpatchedConsole.warn('[Faro Transport] Dropping items due to rate limit');

        return Promise.resolve();
      }

      await this.promiseBuffer.add(() => {
        const transportBody = getTransportBody(items);
        const body = JSON.stringify(transportBody);

        const { url, requestOptions, apiKey } = this.options;

        const { headers, ...restOfRequestOptions } = requestOptions ?? {};

        let sessionId;
        const sessionMeta = this.metas.value.session;
        if (sessionMeta != null) {
          sessionId = sessionMeta.id;
        }

        this.unpatchedConsole.log('[Faro Transport] Sending to:', url);
        this.unpatchedConsole.log('[Faro Transport] Transport body:', JSON.stringify(transportBody, null, 2));
        this.unpatchedConsole.log('[Faro Transport] Body length:', body.length);

        return fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(headers ?? {}),
            ...(apiKey ? { 'x-api-key': apiKey } : {}),
            ...(sessionId ? { 'x-faro-session-id': sessionId } : {}),
          },
          body,
          // Note: React Native doesn't support keepalive
          // keepalive: body.length <= BEACON_BODY_SIZE_LIMIT,
          ...(restOfRequestOptions ?? {}),
        })
          .then(async (response) => {
            this.unpatchedConsole.log('[Faro Transport] Response status:', response.status);

            // Read response body for debugging
            const responseText = await response.text().catch(() => '');
            if (response.status !== ACCEPTED) {
              this.unpatchedConsole.error('[Faro Transport] Error response body:', responseText);
            }

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

            return response;
          })
          .catch((err) => {
            this.unpatchedConsole.error('[Faro Transport] Fetch error:', err);
            this.logError('Failed sending payload to the receiver\n', JSON.parse(body), err);
          });
      });
    } catch (err) {
      this.unpatchedConsole.error('[Faro Transport] Send error:', err);
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
      // TODO: Implement session extension for React Native
      // This will need to work with AsyncStorage-based session manager
      logDebug(`${SessionExpiredString} - session extension not yet implemented for RN.`);
    } else {
      logDebug(`${SessionExpiredString}.`);
    }
  }
}
