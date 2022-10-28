import type { Faro } from '@grafana/faro-web-sdk';

import type { ReactRouterHistory } from '../types';
import type { ReactRouterV4V5Dependencies, ReactRouterV4V5RouteShape } from './types';

export let isInitialized = false;
export let faro: Faro;
export let history: ReactRouterHistory;
export let Route: ReactRouterV4V5RouteShape;

export function setDependencies(dependencies: ReactRouterV4V5Dependencies, newFaro: Faro): void {
  isInitialized = true;

  faro = newFaro;
  history = dependencies.history;
  Route = dependencies.Route;
}

export function setReactRouterV4V5SSRDependencies(newDependencies: Pick<ReactRouterV4V5Dependencies, 'Route'>): void {
  Route = newDependencies.Route;
}
