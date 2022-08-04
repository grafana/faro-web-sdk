import { globalObject } from '../utils';
import { internalGlobalObjectKey } from './const';
import type { Agent } from './types';

export function getInternalAgentFromGlobalObject(): Agent | undefined {
  return globalObject[internalGlobalObjectKey];
}

export function setInternalAgentOnGlobalObject(agent: Agent): void {
  agent.internalLogger.debug('Registering internal agent on global object');

  Object.defineProperty(globalObject, internalGlobalObjectKey, {
    configurable: false,
    enumerable: false,
    writable: false,
    value: agent,
  });
}

export function isInternalAgentOnGlobalObject(): boolean {
  return internalGlobalObjectKey in globalObject;
}
