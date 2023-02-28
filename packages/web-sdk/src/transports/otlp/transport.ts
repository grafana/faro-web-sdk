import { BaseTransport, createPromiseBuffer, PromiseBuffer, TransportItem, VERSION } from '@grafana/faro-core';

import { OtelPayload, OtelTransportPayload } from './payload';
import type { OtlpHttpTransportOptions } from './types';

const DEFAULT_BUFFER_SIZE = 30;
const DEFAULT_CONCURRENCY = 5; // chrome supports 10 total, firefox 17
const DEFAULT_RATE_LIMIT_BACKOFF_MS = 5000;
const DEFAULT_BATCH_SEND_TIMEOUT_MS = 250;
const DEFAULT_BATCH_SEND_COUNT = 50;

export class OtlpHttpTransport extends BaseTransport {
  readonly name = '@grafana/faro-web-sdk:transport-otlp-http';
  readonly version = VERSION;

  private readonly promiseBuffer: PromiseBuffer<Response | void>;
  private readonly rateLimitBackoffMs: number;
  private readonly batchSendCount: number;
  private readonly batchSendTimeout: number;

  private signalCount = 0;
  private otelPayload = new OtelPayload(undefined, this.internalLogger);
  private timeoutId?: number = undefined;

  private disabledUntil: Date = new Date();

  constructor(private options: OtlpHttpTransportOptions) {
    super();
    this.rateLimitBackoffMs = options.defaultRateLimitBackoffMs ?? DEFAULT_RATE_LIMIT_BACKOFF_MS;

    this.batchSendCount = options.batchSendCount ?? DEFAULT_BATCH_SEND_COUNT;
    this.batchSendTimeout = options.batchSendTimeout ?? DEFAULT_BATCH_SEND_TIMEOUT_MS;

    this.promiseBuffer = createPromiseBuffer({
      size: options?.bufferSize ?? DEFAULT_BUFFER_SIZE,
      concurrency: options?.concurrency ?? DEFAULT_CONCURRENCY,
    });

    // Send batched/buffered data when user navigates to new page, switches or closes the tab, minimizes or closes the browser.
    // If on mobile, it also sends data if user switches from the browser to a different app.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.sendPayload(this.otelPayload.getPayload());
        this.reset();
      }
    });
  }

  override getIgnoreUrls(): Array<string | RegExp> {
    const { tracesURL = '', logsURL = '', metricsURL = '' } = this.options;
    return [tracesURL, logsURL, metricsURL].filter(Boolean);
  }

  send(item: TransportItem): void {
    clearTimeout(this.timeoutId);

    this.otelPayload.addResourceItem(item);
    this.signalCount++;

    if (this.signalCount >= this.batchSendCount) {
      this.sendPayload(this.otelPayload.getPayload());
      this.reset();
      return;
    }

    this.timeoutId = window.setTimeout(() => {
      this.sendPayload(this.otelPayload.getPayload());
      this.reset();
    }, this.batchSendTimeout);
  }

  private reset(): void {
    this.signalCount = 0;
    this.otelPayload = new OtelPayload(undefined, this.internalLogger);
  }

  private sendPayload(payload: OtelTransportPayload): void {
    try {
      if (this.disabledUntil > new Date(Date.now())) {
        this.logWarn(`Dropping transport item due to too many requests. Backoff until ${this.disabledUntil}`);
        return undefined;
      }

      const { tracesURL = '', logsURL = '', metricsURL = '' } = this.options;

      for (const [key, value] of Object.entries(payload)) {
        let url = '';
        switch (key) {
          case 'resourceSpans':
            url = tracesURL;
            break;
          case 'resourceLogs':
            url = logsURL;
            break;
          case 'resourceMetrics':
            url = metricsURL;
            break;
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
                this.disabledUntil = this.getRetryAfterDate(response);
                this.logWarn(`Too many requests, backing off until ${this.disabledUntil}`);
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
