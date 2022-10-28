import { initializeFaro as coreInit } from '@grafana/faro-core';
import type { Faro } from '@grafana/faro-core';

import { makeCoreConfig } from './config';
import type { BrowserConfig } from './config';

export function initializeFaro(config: BrowserConfig): Faro {
  const coreConfig = makeCoreConfig(config);

  if (!coreConfig) {
    return undefined!;
  }

  return coreInit(coreConfig);
}
