import { initializeGlobalAgent } from './agent';
import { initializeAPI } from './api';
import type { Config } from './config';
import { initializeInstrumentations } from './instrumentations';
import { shutdownInstrumentations } from './instrumentations/initialize';
import { initializeMetas } from './metas';
import { initializeTransports } from './transports';
import type { Agent } from './types';
import { globalObject } from './utils';

export function initializeAgent(config: Config): Agent {
  const metas = initializeMetas(config);
  const transports = initializeTransports(config);
  const api = initializeAPI(config, transports, metas);

  const shutdown = () => {
    shutdownInstrumentations(config);
    transports.shutdown()
    if (!agent.config.preventGlobalExposure) {
      // @ts-ignore
      delete globalObject[agent.config.globalObjectKey]
    }
  }

  const agent = initializeGlobalAgent({
    config,
    metas,
    transports,
    api,
    shutdown,
  });

  if (!agent.config.preventGlobalExposure) {
    // @ts-ignore
    globalObject[agent.config.globalObjectKey] = agent
  }

  initializeInstrumentations(agent.config);
  return agent;
}
