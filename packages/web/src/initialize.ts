import { initializeGrafanaAgent as coreInit } from '@grafana/agent-core';
import type { Agent } from '@grafana/agent-core';

import { makeCoreConfig } from './config';
import type { BrowserConfig } from './config';

export function initializeGrafanaAgent(config: BrowserConfig): Agent {
  const coreConfig = makeCoreConfig(config);

  if (!coreConfig) {
    return undefined!;
  }

  return coreInit(coreConfig);
}
