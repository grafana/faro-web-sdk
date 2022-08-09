import { globalObject } from '../globalObject';
import type { Agent } from './types';

export function setAgentOnGlobalObject(agent: Agent): void {
  if (!agent.config.preventGlobalExposure) {
    agent.internalLogger.debug(
      `Registering public agent in the global scope using "${agent.config.globalObjectKey}" key`
    );

    if (agent.config.globalObjectKey in globalObject) {
      agent.internalLogger.warn(
        `Skipping global registration due to key "${agent.config.globalObjectKey}" being used already. Please set "globalObjectKey" to something else or set "preventGlobalExposure" to "true"`
      );

      return;
    }

    Object.defineProperty(globalObject, agent.config.globalObjectKey, {
      configurable: false,
      writable: false,
      value: agent,
    });
  } else {
    agent.internalLogger.debug('Skipping registering public agent in the global scope');
  }
}
