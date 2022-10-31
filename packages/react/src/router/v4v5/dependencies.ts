import type { Agent } from '@grafana/faro-web-sdk';

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

export function setReactRouterV4V5SSRDependencies(newDependencies: Pick<ReactRouterV4V5Dependencies, 'Route'>): void {
  Route = newDependencies.Route;
}
