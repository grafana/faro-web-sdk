import { initializeGlobalAgent } from './agent';
import { initializeAPI } from './api';
import type { Config } from './config';
import { initializeInstrumentations } from './instrumentations';
import { initializeMetas } from './metas';
import { initializeTransports } from './transports';
import type { Agent } from './types';
import { globalObject } from './utils';

export function initializeAgent(config: Config): Agent {
  const metas = initializeMetas(config);
  const transports = initializeTransports(config);
  const api = initializeAPI(config, transports, metas);

  const pause = () => transports.pause();
  const unpause = () => transports.unpause();

  const agent = initializeGlobalAgent({
    config,
    metas,
    transports,
    api,
    pause,
    unpause
  });

  if (!agent.config.preventGlobalExposure) {
    Object.defineProperty(globalObject, agent.config.globalObjectKey, {
      value: agent,
    });
  }

  initializeInstrumentations(agent.config);
  return agent;
}
