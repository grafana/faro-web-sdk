import { BaseTransport, createPromiseBuffer, getTransportBody, VERSION } from '@grafana/faro-core';
import type { Patterns, PromiseBuffer, TransportItem } from '@grafana/faro-core';

import type { FetchTransportOptions } from './types';

const DEFAULT_BUFFER_SIZE = 30;
const DEFAULT_CONCURRENCY = 5;
const DEFAULT_RATE_LIMIT_BACKOFF_MS = 5000;
const MAX_CONSECUTIVE_FAILURES = 3;
const FAILURE_BACKOFF_MS = 30000; // 30 seconds

const TOO_MANY_REQUESTS = 429;

export class FetchTransport extends BaseTransport {
  readonly name = '@grafana/faro-react-native:transport-fetch';
  readonly version = VERSION;

  promiseBuffer: PromiseBuffer<Response | void>;

  private readonly rateLimitBackoffMs: number;
  private readonly getNow: () => number;
  private disabledUntil: Date = new Date();
  private consecutiveFailures: number = 0;

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
      const now = new Date(this.getNow());

      // Check if we're in backoff period
      if (this.disabledUntil > now) {
        // Silently drop events during backoff to prevent infinite loops
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
            // Reset failure counter on success
            this.consecutiveFailures = 0;

            // Note: Session extension via X-Faro-Session-Status header is not yet implemented for React Native
            // This would require integration with AsyncStorage-based session manager

            if (response.status === TOO_MANY_REQUESTS) {
              this.disabledUntil = this.getRetryAfterDate(response);
            }

            return response;
          })
          .catch(() => {
            // Increment failure counter
            this.consecutiveFailures++;

            // After MAX_CONSECUTIVE_FAILURES, enable circuit breaker to prevent infinite loops
            if (this.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
              this.disabledUntil = new Date(this.getNow() + FAILURE_BACKOFF_MS);
              // Reset counter so we can try again after backoff
              this.consecutiveFailures = 0;
            }

            // Do NOT log errors to console - this causes infinite loops in React Native
            // when the DevTools console override intercepts even unpatchedConsole calls
          });
      });
    } catch {
      // Buffer full error - Do NOT log to console as it creates infinite loops
      // The error is typically "Task buffer full" when the device is offline
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
}
