import { initializeAgent, isInternalAgentOnGlobalObject } from './agent';
import type { Agent } from './agent';
import { initializeAPI } from './api';
import type { Config } from './config';
import { initializeInstrumentations } from './instrumentations';
import { initializeInternalLogger } from './internalLogger';
import { initializeMetas } from './metas';
import { initializeTransports } from './transports';
import { initializeUnpatchedConsole } from './unpatchedConsole';

export function initializeGrafanaAgent(config: Config): Agent {
  const unpatchedConsole = initializeUnpatchedConsole(config);
  const internalLogger = initializeInternalLogger(unpatchedConsole, config);

  internalLogger.debug('Initializing');

  if (isInternalAgentOnGlobalObject() && !config.isolate) {
    internalLogger.error(
      'An agent is already registered. Either add instrumentations, transports etc. to the global agent or use the "isolate" property'
    );

    return undefined!;
  }

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
  } as Agent);

  agent.instrumentations = initializeInstrumentations(agent.internalLogger, agent.config);

  return agent;
}

// TODO: Remove this alias after the updating the projects where we dogfood
export function initializeAgentDeprecated(config: Config): Agent {
  const agent = initializeGrafanaAgent(config);

  agent.internalLogger.warn('initializeAgent method is deprecated. Please use initializeGrafanaAgent method instead');

  return agent;
}
