export interface FetchTransportRequestOptions extends Omit<RequestInit, 'body' | 'headers'> {
  headers?: Record<string, string>;
}

export interface FetchTransportOptions {
  // url of the collector endpoint
  url: string;

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
  // get current date. for mocking purposes in tests
  getNow?: ClockFn;
  // addition options for global.Fetch
  requestOptions?: FetchTransportRequestOptions;
}

export type ClockFn = () => number;
