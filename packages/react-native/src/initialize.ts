import { initializeFaro as initializeFaroCore, type Faro } from '@grafana/faro-core';
import type { ReactNativeConfig } from './config/types';
import { makeRNConfig } from './config/makeRNConfig';

export function initializeFaro(config: ReactNativeConfig): Faro {
  const fullConfig = makeRNConfig(config);
  return initializeFaroCore(fullConfig);
}
