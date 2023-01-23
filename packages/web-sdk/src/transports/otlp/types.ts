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
  // Protocol, https is default
  readonly scheme?: 'http' | 'https';
  // The host for the standard otlp endpoints. The paths for traces logs and metric will be attached to this.
  readonly host?: string;
  // Custom URL override for trace data
  readonly overwriteTracesURL?: string;
  // Custom URL override for log data
  readonly overwriteLogsURL?: string;
  // Custom URL override for metric data
  readonly overwriteMetricsURL?: string;
}
