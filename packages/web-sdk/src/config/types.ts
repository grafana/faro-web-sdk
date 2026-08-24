import type { Config } from '@grafana/faro-core';
import type { FetchTransportOptions as ReliableFetchTransportOptions } from '../transports/fetch-reliable';

export interface BrowserConfig extends Partial<Omit<Config, 'app' | 'parseStacktrace'>>, Pick<Config, 'app'> {
  url?: string;
  apiKey?: string;
  requestCompression?: boolean;
  /**
   * Tuning for the experimental reliable Fetch transport. Ignored unless
   * `experimental.reliableFetchTransport` is enabled.
   */
  reliableFetchTransportOptions?: Omit<
    ReliableFetchTransportOptions,
    'url' | 'apiKey' | 'requestCompression' | 'getNow' | 'getRandom'
  >;
}

export interface GetWebInstrumentationsOptions {
  captureConsole?: boolean;
  enablePerformanceInstrumentation?: boolean;
  enableContentSecurityPolicyInstrumentation?: boolean;
}
