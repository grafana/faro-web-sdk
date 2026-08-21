export interface FetchTransportRequestOptions extends Omit<RequestInit, 'body' | 'headers'> {
  /**
   * Headers to include in every request.
   * Each value can be:
   * - a string (static value)
   * - a function returning a string (dynamic value, sync)
   * - a function returning a Promise of string (dynamic value, async)
   */
  headers?: Record<string, string | (() => string | Promise<string>)>;
}

export interface FetchTransportRetryOptions {
  // maximum number of logical attempts, including the original request
  maxAttempts: number;
  // delay before the first retry
  initialBackoffMs: number;
  // maximum exponential backoff delay
  maxBackoffMs: number;
  // multiplier applied to each subsequent exponential backoff
  backoffMultiplier: number;
  // HTTP response status codes eligible for retry
  retryableStatusCodes: number[];
  // maximum elapsed time across all attempts and backoff delays
  maxElapsedTimeMs: number;
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
  // FIXME: Remove in Faro v3.0 and use retry.initialBackoffMs for 429 responses without Retry-After.
  // if rate limit response does not include a Retry-After header,
  // how many milliseconds to back off before attempting a request.
  // intermediate events will be dropped, not buffered
  defaultRateLimitBackoffMs?: number;
  // get current date. for mocking purposes in tests
  getNow?: ClockFn;
  // addition options for global.Fetch
  requestOptions?: FetchTransportRequestOptions;
  // compress request bodies with gzip using the native CompressionStream API.
  // falls back to uncompressed if CompressionStream is not available.
  requestCompression?: boolean;
  // retry policy for transient delivery failures
  retry?: Partial<FetchTransportRetryOptions>;
}

export type ClockFn = () => number;
