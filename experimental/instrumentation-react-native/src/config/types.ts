import type { Config } from '@grafana/faro-core';

export interface ReactNativeConfig extends Config {
  url?: string;
  apiKey?: string;
}
