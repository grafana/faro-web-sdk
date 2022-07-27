import { Agent, Config, initializeGrafanaAgent as coreInit } from '@grafana/agent-core';

import { BrowserConfig, makeCoreConfig } from './config';

export function initializeGrafanaAgent(config: BrowserConfig): Agent {
  const coreConfig = makeCoreConfig(config);

  return coreInit(coreConfig);
}

// TODO: Remove this alias after the updating the projects where we dogfood
export function initializeAgent(config: Config): Agent {
  const agent = initializeGrafanaAgent(config);

  agent.internalLogger.warn(
    'initializeAgent method is deprecated and it will be removed in an upcoming version. Please use initializeGrafanaAgent method instead.'
  );

  return agent;
}
