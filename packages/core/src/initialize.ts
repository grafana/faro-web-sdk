import { initializeAgent } from './agent';
import type { Agent } from './agent';
import { initializeCommander } from './commander';
import { initializeConfig } from './config';
import type { UserConfig } from './config';
import { initializeMeta } from './meta';
import { initializePlugins } from './plugins';
import { initializeTransports } from './transports';

export function initialize(userConfig: UserConfig): Agent {
  const config = initializeConfig(userConfig);

  const meta = initializeMeta();

  const transports = initializeTransports(config);

  const commander = initializeCommander(transports, meta);

  const agent = initializeAgent(config, commander, meta, transports);

  initializePlugins(agent);

  return agent;
}
