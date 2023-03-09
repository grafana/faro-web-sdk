import type { FetchTransportOptions } from '../fetch/types';

export interface OtlpHttpTransportOptions
  extends Pick<
    FetchTransportOptions,
    'apiKey' | 'bufferSize' | 'concurrency' | 'defaultRateLimitBackoffMs' | 'getNow' | 'requestOptions'
  > {
  // The Otel spec defines separate endpoints per signal
  readonly tracesURL?: string;
  readonly logsURL?: string;
  // readonly metricsURL?: string;
}
