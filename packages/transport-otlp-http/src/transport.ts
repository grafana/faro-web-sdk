import { BaseTransport, createPromiseBuffer, isArray, PromiseBuffer, TransportItem, VERSION } from '@grafana/faro-core';

import { OtelPayload, OtelTransportPayload } from './payload';
import type { OtlpHttpTransportOptions } from './types';

const DEFAULT_BUFFER_SIZE = 30;
const DEFAULT_CONCURRENCY = 5; // chrome supports 10 total, firefox 17
const DEFAULT_RATE_LIMIT_BACKOFF_MS = 5000;

export class OtlpHttpTransport extends BaseTransport {
  readonly name = '@grafana/faro-web-sdk:transport-otlp-http';
  readonly version = VERSION;

  private readonly promiseBuffer: PromiseBuffer<Response | void>;
  private readonly rateLimitBackoffMs: number;

  private sendingTracesDisabledUntil: Date = new Date();
  private sendingLogsDisabledUntil: Date = new Date();

  constructor(private options: OtlpHttpTransportOptions) {
    super();
    this.rateLimitBackoffMs = options.defaultRateLimitBackoffMs ?? DEFAULT_RATE_LIMIT_BACKOFF_MS;

    this.promiseBuffer = createPromiseBuffer({
      size: options?.bufferSize ?? DEFAULT_BUFFER_SIZE,
      concurrency: options?.concurrency ?? DEFAULT_CONCURRENCY,
    });
  }

  override getIgnoreUrls(): Array<string | RegExp> {
    const { tracesURL = '', logsURL = '' } = this.options;
    return [tracesURL, logsURL].filter(Boolean);
  }

  send(item: TransportItem | TransportItem[]): void {
    const otelPayload = new OtelPayload(this.internalLogger);
    const items = isArray(item) ? item : [item];

    items.forEach((item) => otelPayload.addResourceItem(item));
    this.sendPayload(otelPayload.getPayload());
  }

  private sendPayload(payload: OtelTransportPayload): void {
    try {
      const { tracesURL = '', logsURL = '' } = this.options;

      for (const [key, value] of Object.entries(payload)) {
        if (!(isArray(value) && value.length > 0)) {
          continue;
        }

        let disabledUntil: Date | undefined;
        let updateDisabledUntil = (_: Date) => {};
        let url = '';

        switch (key) {
          case 'resourceSpans':
            url = tracesURL;
            disabledUntil = this.sendingTracesDisabledUntil;
            updateDisabledUntil = (retryAfterDate: Date) => {
              this.sendingTracesDisabledUntil = retryAfterDate;
            };
            break;
          case 'resourceLogs':
            url = logsURL;
            disabledUntil = this.sendingLogsDisabledUntil;
            updateDisabledUntil = (retryAfterDate: Date) => {
              this.sendingLogsDisabledUntil = retryAfterDate;
            };
            break;
        }

        if (disabledUntil && disabledUntil > new Date(Date.now())) {
          this.logWarn(`Dropping transport item due to too many requests. Backoff until ${disabledUntil}`);
          return undefined;
        }

        const body = JSON.stringify(value);

        const { requestOptions, apiKey } = this.options;
        const { headers, ...restOfRequestOptions } = requestOptions ?? {};

        this.promiseBuffer.add(() => {
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
                updateDisabledUntil(this.getRetryAfterDate(response));
                this.logWarn(`Too many requests, backing off until ${disabledUntil}`);
              }

              return response;
            })
            .catch((error) => {
              this.logError('Failed sending payload to the receiver\n', JSON.parse(body), error);
            });
        });
      }
    } catch (error) {
      this.logError(error);
    }
  }

  private getRetryAfterDate(response: Response): Date {
    const now = Date.now();
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
