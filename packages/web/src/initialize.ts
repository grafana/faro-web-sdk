import { Agent, initializeAgent as coreInit } from '@grafana/agent-core';

import { BrowserConfig, makeCoreConfig } from './config';

export function initializeAgent(config: BrowserConfig): Agent {
  const coreConfig = makeCoreConfig(config);
  return coreInit(coreConfig);
}
