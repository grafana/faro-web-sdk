import { BaseTransport, createPromiseBuffer, getTransportBody, noop, PromiseBuffer, VERSION } from '@grafana/faro-core';
import type { TransportItem } from '@grafana/faro-core';

import type { FetchTransportOptions } from './types';

const DEFAULT_BUFFER_SIZE = 30;
const DEFAULT_CONCURRENCY = 5; // chrome supports 10 total, firefox 17
const DEFAULT_RATE_LIMIT_BACKOFF_MS = 5000;

export class FetchTransport extends BaseTransport {
  readonly name = '@grafana/faro-web-sdk:transport-fetch';
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

  async send(item: TransportItem): Promise<void> {
    try {
      if (this.disabledUntil > new Date(this.getNow())) {
        this.logWarn(`Dropping transport item due to too many requests. Backoff until ${this.disabledUntil}`);

        return Promise.resolve();
      }

      await this.promiseBuffer.add(() => {
        const body = JSON.stringify(getTransportBody(item));

        const { url, requestOptions, apiKey } = this.options;

        const { headers, ...restOfRequestOptions } = requestOptions ?? {};

        return fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(headers ?? {}),
            ...(apiKey ? { 'x-api-key': apiKey } : {}),
          },
          body,
          keepalive: true,
          ...(restOfRequestOptions ?? {}),
        })
          .then((response) => {
            if (response.status === 429) {
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

  override getIgnoreUrls(): Array<string | RegExp> {
    return [this.options.url];
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
