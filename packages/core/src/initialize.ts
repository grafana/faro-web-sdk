import { initializeGlobalAgent } from './agent';
import { initializeAPI } from './api';
import { initializeConfig } from './config';
import type { UserConfig } from './config';
import { initializeInstrumentations } from './instrumentations';
import { initializeMetas } from './metas';
import { initializeTransports } from './transports';
import type { Agent } from './types';
import { globalObject } from './utils';

export function initializeAgent(userConfig: UserConfig): Agent {
  const config = initializeConfig(userConfig);
  const metas = initializeMetas(config);
  const transports = initializeTransports(config);
  const api = initializeAPI(transports, metas);

  const agent = initializeGlobalAgent({
    config,
    metas,
    transports,
    api,
  });

  if (!agent.config.preventGlobalExposure) {
    Object.defineProperty(globalObject, agent.config.globalObjectKey, {
      value: agent,
    });
  }

  initializeInstrumentations(agent.config);
  return agent;
}
