export interface OtlpTransportRequestOptions extends Omit<RequestInit, 'body' | 'headers'> {
  headers?: Record<string, string>;
}

export interface OtlpTransportOptions {
  // url of the collector endpoint
  url: string;

  // will be added as `x-api-key` header
  apiKey?: string;

  // how many requests to buffer in total
  bufferSize?: number;

  // how many signals to send in one request
  sendBatchSize?: number;

  // how many seconds to wait till we send the the signals
  timeout?: number;

  // how many requests to execute concurrently
  concurrency?: number;

  // if rate limit response does not include a Retry-After header,
  // how many milliseconds to back off before attempting a request.
  // intermediate events will be dropped, not buffered
  defaultRateLimitBackoffMs?: number;

  // get current date. for mocking purposes in tests
  getNow?: ClockFn;

  // addition options for global.Fetch
  requestOptions?: OtlpTransportRequestOptions;
}

export type ClockFn = () => number;
