import type { Config } from '@grafana/faro-core';

export interface BrowserConfig extends Partial<Omit<Config, 'app' | 'parseStacktrace'>>, Pick<Config, 'app'> {
  url?: string;
  apiKey?: string;
}

export interface GetWebInstrumentationsOptions {
  captureConsole?: boolean;
  enablePerformanceInstrumentation?: boolean;
  enableContentSecurityPolicyInstrumentation?: boolean;
  enableUserEventsInstrumentation?: boolean;
}
