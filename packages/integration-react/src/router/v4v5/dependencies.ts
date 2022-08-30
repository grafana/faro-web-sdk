import type { Agent } from '@grafana/agent-web';

import type { ReactRouterHistory } from '../types';
import type { ReactRouterV4V5Dependencies, ReactRouterV4V5RouteShape } from './types';

export let isInitialized = false;
export let agent: Agent;
export let history: ReactRouterHistory;
export let Route: ReactRouterV4V5RouteShape;

export function setDependencies(dependencies: ReactRouterV4V5Dependencies, newAgent: Agent): void {
  isInitialized = true;

  agent = newAgent;
  history = dependencies.history;
  Route = dependencies.Route;
}
