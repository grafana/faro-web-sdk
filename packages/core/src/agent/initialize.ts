import type { Agent } from './types';

export let agent: Agent = {} as Agent;

export function initializeAgent(newAgent: Agent): Agent {
  agent = newAgent;

  return agent;
}
