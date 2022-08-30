import type { InternalLogger } from '../internalLogger';
import { setAgentOnGlobalObject } from './agentGlobalObject';
import { setInternalAgentOnGlobalObject } from './internalAgentGlobalObject';
import type { Agent } from './types';

export let agent: Agent = {} as Agent;

export function initializeAgent(internalLogger: InternalLogger, newAgent: Agent): Agent {
  internalLogger.debug('Initializing agent');

  agent = newAgent;

  setInternalAgentOnGlobalObject(agent);

  setAgentOnGlobalObject(agent);

  return agent;
}
