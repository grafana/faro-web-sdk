import { Agent, initializeGrafanaAgent as coreInit } from '@grafana/agent-core';

import { BrowserConfig, makeCoreConfig } from './config';

export function initializeGrafanaAgent(config: BrowserConfig): Agent {
  const coreConfig = makeCoreConfig(config);

  return coreInit(coreConfig);
}

// TODO: Remove this alias after the updating the projects where we dogfood
export const initializeAgent = initializeGrafanaAgent;
