import type { Agent } from './types';

export let agent: Agent = {} as Agent;

export const initializeGlobalAgent = (newAgent: Agent) => {
  agent = newAgent;

  return agent;
};
