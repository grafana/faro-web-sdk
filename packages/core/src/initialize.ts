import { initializeCommander } from './commander';
import { initializeConfig } from './config';
import type { UserConfig } from './config';
import { initializeMeta } from './meta';
import { initializePlugins } from './plugins';
import { initializeTransports } from './transports';
import type { Agent } from './types';
import { globalObject } from './utils';

export let agent: Agent;

export function initializeAgent(userConfig: UserConfig): Agent {
  const config = initializeConfig(userConfig);

  const meta = initializeMeta();

  const transports = initializeTransports(config);

  const commander = initializeCommander(transports, meta);

  agent = {
    config,
    commander,
    meta,
    transports,
  };

  if (!config.preventGlobalExposure) {
    Object.defineProperty(globalObject, config.globalObjectKey, {
      value: agent,
    });
  }

  initializePlugins(agent);

  return agent;
}
