import { initializeGrafanaAgent as coreInit } from '@grafana/agent-core';
import type { Agent, Config } from '@grafana/agent-core';

import { makeCoreConfig } from './config';
import type { BrowserConfig } from './config';

export function initializeGrafanaAgent(config: BrowserConfig): Agent {
  const coreConfig = makeCoreConfig(config);

  if (!coreConfig) {
    return undefined!;
  }

  return coreInit(coreConfig);
}

// TODO: Remove this alias after the updating the projects where we dogfood
export function initializeAgent(config: Config): Agent {
  const agent = initializeGrafanaAgent(config);

  agent.internalLogger.warn(
    'initializeAgent method is deprecated and it will be removed in an upcoming version. Please use initializeGrafanaAgent method instead'
  );

  return agent;
}
