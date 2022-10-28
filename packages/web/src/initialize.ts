import { initializeGrafanaAgent as coreInit } from '@grafana/faro-core';
import type { Agent } from '@grafana/faro-core';

import { makeCoreConfig } from './config';
import type { BrowserConfig } from './config';

export function initializeGrafanaAgent(config: BrowserConfig): Agent {
  const coreConfig = makeCoreConfig(config);

  if (!coreConfig) {
    return undefined!;
  }

  return coreInit(coreConfig);
}
