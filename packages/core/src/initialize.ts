import { initializeAgent } from './agent';
import type { Agent } from './agent';
import { initializeAPI } from './api';
import type { Config } from './config';
import { initializeInstrumentations } from './instrumentations';
import { initializeInternalLogger } from './internalLogger';
import { initializeMetas } from './metas';
import { initializeOriginalConsole } from './originalConsole';
import { initializeTransports } from './transports';
import { globalObject } from './utils';

export function initializeGrafanaAgent(config: Config): Agent {
  const originalConsole = initializeOriginalConsole(config);
  const internalLogger = initializeInternalLogger(config);
  const metas = initializeMetas(config);
  const transports = initializeTransports(config);
  const api = initializeAPI(config, transports, metas);

  const agent = initializeAgent({
    api,
    config,
    internalLogger,
    metas,
    transports,
    originalConsole
  });

  if (!agent.config.preventGlobalExposure) {
    Object.defineProperty(globalObject, agent.config.globalObjectKey, {
      value: agent,
    });
  }

  initializeInstrumentations(agent.config);

  return agent;
}
