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
  const metas = initializeMetas(internalLogger, config);
  const transports = initializeTransports(internalLogger, config);
  const api = initializeAPI(internalLogger, config, transports, metas);

  const agent = initializeAgent(internalLogger, {
    api,
    config,
    internalLogger,
    metas,
    originalConsole,
    pause: transports.pause,
    transports,
    unpause: transports.unpause,
  });

  if (!agent.config.preventGlobalExposure) {
    Object.defineProperty(globalObject, agent.config.globalObjectKey, {
      value: agent,
    });
  }

  initializeInstrumentations(internalLogger, agent.config);

  return agent;
}
