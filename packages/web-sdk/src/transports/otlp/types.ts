import type { FetchTransportOptions, FetchTransportRequestOptions } from '../fetch/types';

export type OtlpTransportRequestOptions = FetchTransportRequestOptions;

export interface OtlpHttpTransportOptions
  extends Pick<
    FetchTransportOptions,
    'apiKey' | 'bufferSize' | 'concurrency' | 'defaultRateLimitBackoffMs' | 'getNow' | 'requestOptions'
  > {
  // The Otel spec defines separate endpoints per signal
  readonly tracesURL?: string;
  readonly logsURL?: string;

  // addition options for global.Fetch
  requestOptions?: OtlpTransportRequestOptions;
}
