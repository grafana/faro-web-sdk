import type { ReactRouterHistory } from '../types';

export type ReactRouterV4V5RouteShape = any;

export interface ReactRouterV4V5RouteProps extends Record<string, any> {
  computedMatch?: {
    isExact: boolean;
    path: string;
  };
}

export interface ReactRouterV4V5Dependencies {
  history: ReactRouterHistory;
  Route: ReactRouterV4V5RouteShape;
}

export interface ReactRouterV4V5ActiveEvent extends Record<string, string> {
  route: string;
  url: string;
}
