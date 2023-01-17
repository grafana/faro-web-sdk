import type { ReactRouterHistory } from '../types';

import type { ReactRouterV4V5Dependencies, ReactRouterV4V5RouteShape } from './types';

export let isInitialized = false;
export let history: ReactRouterHistory;
export let Route: ReactRouterV4V5RouteShape;

export function setReactRouterV4V5Dependencies(dependencies: ReactRouterV4V5Dependencies): void {
  isInitialized = true;

  history = dependencies.history;
  Route = dependencies.Route;
}

export function setReactRouterV4V5SSRDependencies(newDependencies: Pick<ReactRouterV4V5Dependencies, 'Route'>): void {
  Route = newDependencies.Route;
}
