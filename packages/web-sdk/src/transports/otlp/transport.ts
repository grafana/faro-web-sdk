import {
  APIEvent,
  BaseTransport,
  createPromiseBuffer,
  EventEvent,
  ExceptionEvent,
  LogEvent,
  MeasurementEvent,
  PromiseBuffer,
  TransportItem,
  TransportItemType,
  VERSION,
} from '@grafana/faro-core';
import type { TraceEvent } from 'packages/core/src/api';
import { Payload } from './transform/Payload';
import { Resource } from './transform/Resource';
import { ResourceLog } from './transform/ResourceLog';
import type { OtlpTransportOptions } from './types';

const DEFAULT_BUFFER_SIZE = 30;
const DEFAULT_CONCURRENCY = 5; // chrome supports 10 total, firefox 17

const DEFAULT_SEND_BATCH_SIZE = 30;
const DEFAULT_TIMEOUT_MS = 200; // same as default in Otel processor
const DEFAULT_RATE_LIMIT_BACKOFF_MS = 5000;

export class OtlpTransport extends BaseTransport {
  readonly name = '@grafana/faro-web-sdk:transport-fetch';
  readonly version = VERSION;

  private readonly rateLimitBackoffMs: number;
  private disabledUntil: Date = new Date();

  private readonly getNow: () => number;

  private readonly sendBatchSize: number;
  private readonly sendTimeoutMs: number;

  // private readonly signalsBuffer: TransportItem<APIEvent>[] = [];

  private payload: Payload;
  private signalCount = 0;

  promiseBuffer: PromiseBuffer<Response | void>;

  constructor(private options: OtlpTransportOptions) {
    super();

    this.promiseBuffer = createPromiseBuffer({
      size: options.bufferSize ?? DEFAULT_BUFFER_SIZE,
      concurrency: options.concurrency ?? DEFAULT_CONCURRENCY,
    });

    this.rateLimitBackoffMs = options.defaultRateLimitBackoffMs ?? DEFAULT_RATE_LIMIT_BACKOFF_MS;
    this.sendBatchSize = options.sendBatchSize ?? DEFAULT_SEND_BATCH_SIZE;
    this.sendTimeoutMs = options.timeout ?? DEFAULT_TIMEOUT_MS;
    this.getNow = options.getNow ?? (() => Date.now());

    this.payload = new Payload();
  }

  send(item: TransportItem<APIEvent>): void {
    // TODO: Pseudo code how counting and adding scope item could work
    if (this.signalCount >= DEFAULT_SEND_BATCH_SIZE) {
      // TODO: sendPayload();
      this.signalCount = 0;
      this.payload = new Payload();
    } else {
      // add to resource*
      const { type, meta } = item;

      if (type === TransportItemType.LOG) {
        const resourceLog = this.payload.ressourceLogs.find((log) => log.resource?.isSameMeta(meta));

        if (resourceLog) {
          resourceLog.addScopeLog();
        } else {
          this.payload.addResourceLog(new ResourceLog(new Resource(item)));
        }

        // if we have a resource for the specific in payload resource* which has the same resource object,
        // then add it

        this.signalCount++;
      }
    }
  }

  private async sendSignals(items: TransportItem[]): Promise<void> {
    try {
      if (this.disabledUntil > new Date(this.getNow())) {
        this.logWarn(`Dropping transport item due to too many requests. Backoff until ${this.disabledUntil}`);

        return Promise.resolve();
      }

      await this.promiseBuffer.add(() => {
        const body = JSON.stringify(this.getListTransportBody(items));

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
            if (response.status === 429 /* too many requests */) {
              this.disabledUntil = this.getRetryAfterDate(response);
              this.logWarn(`Too many requests, backing off until ${this.disabledUntil}`);
            }

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

  private getListTransportBody(items: TransportItem[]): OtlpTransportBody {
    const body: OtlpTransportBody = {
      resourceMetrics: [],
      resourceLogs: [],
      resourceSpans: [],
    };

    for (const item of items) {
      const { type } = item;

      if (type === TransportItemType.MEASUREMENT) {
        body.resourceMetrics.push((item as TransportItem<MeasurementEvent>).payload);
      }

      if (type === TransportItemType.TRACE) {
        body.resourceSpans.push((item as TransportItem<TraceEvent>).payload);
      }

      if (type === TransportItemType.LOG) {
        body.resourceLogs.push((item as TransportItem<LogEvent>).payload);
      }

      if (type === TransportItemType.EXCEPTION) {
        body.resourceLogs.push((item as TransportItem<ExceptionEvent>).payload);
      }

      if (type === TransportItemType.EVENT) {
        body.resourceLogs.push((item as TransportItem<EventEvent>).payload);
      }
    }

    return body;
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

interface OtlpTransportBody {
  resourceMetrics: MeasurementEvent[];
  resourceLogs: (LogEvent | ExceptionEvent | EventEvent)[];
  resourceSpans: TraceEvent[];
}
