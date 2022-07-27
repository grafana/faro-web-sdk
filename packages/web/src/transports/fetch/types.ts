export interface FetchTransportRequestOptions extends Omit<RequestInit, 'body' | 'headers'> {
  headers?: Record<string, string>;
}

export interface FetchTransportOptions {
  // url of the collector endpoint
  url: string;

  // will be added as `x-api-key` header
  apiKey?: string;
  requestOptions?: FetchTransportRequestOptions;
}
