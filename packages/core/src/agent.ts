import { Config } from './config';
import { Logger, logger } from './logger';

export interface Agent {
  config: Config;
  logger: Logger;
}

export let agent: Agent | null = null;

export function createAgent(config: Config): Agent {
  config.plugins.forEach((plugin) => {
    plugin.initialize(config);
  });

  return {
    config,
    logger,
  };
}

export function setAgent(newAgent: Agent) {
  agent = newAgent;
}
