import type { Faro } from '@grafana/faro-web-sdk';

import type {
  ReactRouterV6CreateRoutesFromChildren,
  ReactRouterV6Dependencies,
  ReactRouterV6MatchRoutes,
  ReactRouterV6RoutesShape,
  ReactRouterV6UseLocation,
  ReactRouterV6UseNavigationType,
} from './types';

export let isInitialized = false;
export let faro: Faro;
export let createRoutesFromChildren: ReactRouterV6CreateRoutesFromChildren;
export let matchRoutes: ReactRouterV6MatchRoutes;
export let Routes: ReactRouterV6RoutesShape;
export let useLocation: ReactRouterV6UseLocation;
export let useNavigationType: ReactRouterV6UseNavigationType;

export function setDependencies(newDependencies: ReactRouterV6Dependencies, newFaro: Faro): void {
  isInitialized = true;

  faro = newFaro;
  createRoutesFromChildren = newDependencies.createRoutesFromChildren;
  matchRoutes = newDependencies.matchRoutes;
  Routes = newDependencies.Routes;
  useLocation = newDependencies.useLocation;
  useNavigationType = newDependencies.useNavigationType;
}

export function setReactRouterV6SSRDependencies(newDependencies: Pick<ReactRouterV6Dependencies, 'Routes'>): void {
  Routes = newDependencies.Routes;
}
