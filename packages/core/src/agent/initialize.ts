import type { InternalLogger } from '../internalLogger';
import type { Agent } from './types';

export let agent: Agent = {} as Agent;

export function initializeAgent(_internalLogger: InternalLogger, newAgent: Agent): Agent {
  agent = newAgent;

  return agent;
}
