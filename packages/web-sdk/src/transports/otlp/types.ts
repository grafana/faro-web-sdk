import type { FetchTransportOptions } from '../fetch/types';

export interface OtlpHttpTransportOptions
  extends Pick<
    FetchTransportOptions,
    'apiKey' | 'bufferSize' | 'concurrency' | 'defaultRateLimitBackoffMs' | 'getNow' | 'requestOptions'
  > {
  // If no new signal arrives after "batchSendTimeout" ms, send the payload
  readonly batchSendTimeout?: number;
  // Buffer "batchSendCount" signals before sending the payload
  readonly batchSendCount?: number;
  // The Otel spec defines separate endpoints per signal
  readonly tracesURL?: string;
  readonly logsURL?: string;
  readonly metricsURL?: string;
}
