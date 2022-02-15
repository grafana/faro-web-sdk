import { initializeAPI } from './api';
import { initializeConfig } from './config';
import type { UserConfig } from './config';
import { initializeInstrumentations } from './instrumentations';
import { initializeMetas } from './metas';
import { initializeTransports } from './transports';
import type { Agent } from './types';
import { globalObject } from './utils';

export let agent: Agent = {} as Agent;

export function initializeAgent(userConfig: UserConfig): Agent {
  agent.config = initializeConfig(userConfig);
  agent.metas = initializeMetas(agent.config);
  agent.transports = initializeTransports(agent.config);
  agent.api = initializeAPI(agent.transports, agent.metas);

  if (!agent.config.preventGlobalExposure) {
    Object.defineProperty(globalObject, agent.config.globalObjectKey, {
      value: agent,
    });
  }

  initializeInstrumentations(agent.config);

  return agent;
}
