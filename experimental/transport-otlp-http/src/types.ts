import type { ExceptionEvent, MeasurementEvent, TransportItem } from '@grafana/faro-core';

export interface OtlpTransportRequestOptions extends Omit<RequestInit, 'body' | 'headers'> {
  /**
   * Headers to include in every request.
   * Each value can be:
   * - a string (static value)
   * - a function returning a string (dynamic value)
   */
  headers?: Record<string, string | (() => string)>;
}

export interface OtlpHttpTransportOptions {
  // will be added as `x-api-key` header
  apiKey?: string;

  // how many requests to buffer in total
  bufferSize?: number;

  // how many requests to execute concurrently
  concurrency?: number;

  // if rate limit response does not include a Retry-After header,
  // how many milliseconds to back off before attempting a request.
  // intermediate events will be dropped, not buffered
  defaultRateLimitBackoffMs?: number;

  // addition options for global.Fetch
  requestOptions?: OtlpTransportRequestOptions;

  // The Otel spec defines separate endpoints per signal
  readonly tracesURL?: string;
  readonly logsURL?: string;

  // customize aspects about logs transformation
  otlpTransform?: {
    // Body field is optional in Otel Log spec, but can cause issues with Otel Collector components.
    // By default Faro does not send a body for logs of type error and measurement.
    // Users can define a body string by using the following functions.
    createErrorLogBody?: (item: TransportItem<ExceptionEvent>) => string;
    createMeasurementLogBody?: (item: TransportItem<MeasurementEvent>) => string;
  };
}
