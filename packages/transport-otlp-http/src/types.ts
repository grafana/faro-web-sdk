export interface OtlpTransportRequestOptions extends Omit<RequestInit, 'body' | 'headers'> {
  headers?: Record<string, string>;
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
}
