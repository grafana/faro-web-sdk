export interface FetchTransportRequestOptions extends Omit<RequestInit, 'body' | 'headers'> {
  /** Headers resolved once for a batch and reused by every attempt. */
  headers?: Record<string, string | (() => string | Promise<string>)>;
}

export interface RetryOptions {
  /** Total attempts, including the initial request. Default: 3. */
  maxAttempts?: number;
  /** Delay before the first retry. Default: 1000 ms. */
  initialBackoffMs?: number;
  /** Maximum retry delay and collector wait interval. Default: 30000 ms. */
  maxBackoffMs?: number;
  /** Exponential backoff multiplier. Default: 2. */
  backoffMultiplier?: number;
}

export interface FetchTransportOptions {
  url: string;
  apiKey?: string;
  bufferSize?: number;
  concurrency?: number;
  retry?: RetryOptions;
  /** Maximum duration of one logical request attempt. Default: 10000 ms. */
  requestTimeoutMs?: number;
  getNow?: ClockFn;
  getRandom?: RandomFn;
  requestOptions?: FetchTransportRequestOptions;
  requestCompression?: boolean;
}

export type ClockFn = () => number;
export type RandomFn = () => number;
