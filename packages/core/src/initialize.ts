import { initializeAgent } from './agent';
import type { Agent } from './agent';
import { initializeConfig, UserConfig } from './config';
import { initializeLogger } from './logger';
import { initializeMeta } from './meta';
import { initializePlugins } from './plugins';
import { initializeTransports } from './transports';

export function initialize(userConfig: UserConfig): Agent {
  const config = initializeConfig(userConfig);

  const meta = initializeMeta();

  const transports = initializeTransports(config);

  const logger = initializeLogger(transports, meta);

  const agent = initializeAgent(config, logger, meta, transports);

  initializePlugins(agent);

  return agent;
}
