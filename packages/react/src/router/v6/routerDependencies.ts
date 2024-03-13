import type {
  ReactRouterV6CreateRoutesFromChildren,
  ReactRouterV6Dependencies,
  ReactRouterV6MatchRoutes,
  ReactRouterV6NextDependencies,
  ReactRouterV6RoutesShape,
  ReactRouterV6UseLocation,
  ReactRouterV6UseNavigationType,
} from './types';

export let isInitialized = false;
export let createRoutesFromChildren: ReactRouterV6CreateRoutesFromChildren;
export let matchRoutes: ReactRouterV6MatchRoutes;
export let Routes: ReactRouterV6RoutesShape;
export let useLocation: ReactRouterV6UseLocation;
export let useNavigationType: ReactRouterV6UseNavigationType;

export function setReactRouterV6Dependencies(newDependencies: ReactRouterV6Dependencies): void {
  isInitialized = true;

  createRoutesFromChildren = newDependencies.createRoutesFromChildren;
  matchRoutes = newDependencies.matchRoutes;
  Routes = newDependencies.Routes;
  useLocation = newDependencies.useLocation;
  useNavigationType = newDependencies.useNavigationType;
}

export function setReactRouterV6SSRDependencies(newDependencies: Pick<ReactRouterV6Dependencies, 'Routes'>): void {
  Routes = newDependencies.Routes;
}

export function setReactRouterV6NextDependencies(newDependencies: ReactRouterV6NextDependencies): void {
  isInitialized = true;
  matchRoutes = newDependencies.matchRoutes;
}
