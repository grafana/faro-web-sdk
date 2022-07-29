export interface FetchTransportRequestOptions extends Omit<RequestInit, 'body' | 'headers'> {
  headers?: Record<string, string>;
}

export interface FetchTransportOptions {
  // url of the collector endpoint
  url: string;

  // how many requests to buffer in total
  bufferSize?: number;
  // how many requests to execute concurrently
  concurrency?: number;
  // will be added as `x-api-key` header
  apiKey?: string;
  requestOptions?: FetchTransportRequestOptions;
}
