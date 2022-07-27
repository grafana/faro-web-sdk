import { initializeAgent } from './agent';
import type { Agent } from './agent';
import { initializeAPI } from './api';
import type { Config } from './config';
import { initializeInstrumentations } from './instrumentations';
import { initializeInternalLogger } from './internalLogger';
import { initializeMetas } from './metas';
import { initializeTransports } from './transports';
import { initializeUnpatchedConsole } from './unpatchedConsole';
import { globalObject } from './utils';

export function initializeGrafanaAgent(config: Config): Agent {
  const unpatchedConsole = initializeUnpatchedConsole(config);
  const internalLogger = initializeInternalLogger(unpatchedConsole, config);

  internalLogger.debug('Initializing...');

  const metas = initializeMetas(internalLogger, config);
  const transports = initializeTransports(internalLogger, config);
  const api = initializeAPI(internalLogger, config, transports, metas);

  const agent = initializeAgent(internalLogger, {
    api,
    config,
    internalLogger,
    metas,
    pause: transports.pause,
    transports,
    unpatchedConsole,
    unpause: transports.unpause,
  });

  if (!agent.config.preventGlobalExposure) {
    internalLogger.debug(`Registering in the global scope using "${agent.config.globalObjectKey}" key`);

    // TODO: Fix this type
    // Object.assign is avoided due to HMR issues
    (globalObject as any)[agent.config.globalObjectKey] = agent;
  }

  initializeInstrumentations(internalLogger, agent.config);

  return agent;
}

// TODO: Remove this alias after the updating the projects where we dogfood
export function initializeAgentDeprecated(config: Config): Agent {
  const agent = initializeGrafanaAgent(config);

  agent.internalLogger.warn(
    'initializeAgent method is deprecated and it will be removed in an upcoming version. Please use initializeGrafanaAgent method instead.'
  );

  return agent;
}
