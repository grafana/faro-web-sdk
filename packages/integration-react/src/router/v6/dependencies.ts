import type { Agent } from '@grafana/agent-web';

import type {
  ReactRouterV6CreateRoutesFromChildren,
  ReactRouterV6Dependencies,
  ReactRouterV6MatchRoutes,
  ReactRouterV6RoutesShape,
  ReactRouterV6UseLocation,
  ReactRouterV6UseNavigationType,
} from './types';

export let isInitialized = false;
export let agent: Agent;
export let createRoutesFromChildren: ReactRouterV6CreateRoutesFromChildren;
export let matchRoutes: ReactRouterV6MatchRoutes;
export let Routes: ReactRouterV6RoutesShape;
export let useLocation: ReactRouterV6UseLocation;
export let useNavigationType: ReactRouterV6UseNavigationType;

export function setDependencies(dependencies: ReactRouterV6Dependencies, newAgent: Agent): void {
  isInitialized = true;

  agent = newAgent;
  createRoutesFromChildren = dependencies.createRoutesFromChildren;
  matchRoutes = dependencies.matchRoutes;
  Routes = dependencies.Routes;
  useLocation = dependencies.useLocation;
  useNavigationType = dependencies.useNavigationType;
}
