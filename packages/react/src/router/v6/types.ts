import type { ReactElement, ReactNode } from 'react';

import type { ReactRouterLocation } from '../types';

export interface ReactRouterV6BaseRouteObject {
  action?: (...args: any[]) => any;
  caseSensitive?: boolean;
  hasErrorBoundary?: boolean;
  handle?: any;
  id?: string;
  loader?: (...args: any[]) => any;
  path?: string;
  shouldRevalidate?: (...args: any[]) => any;
}

export type ReactRouterV6RouteObject = ReactRouterV6BaseRouteObject &
  (
    | {
        children?: undefined;
        index: true;
      }
    | {
        children?: ReactRouterV6RouteObject[];
        index?: false;
      }
  );

export interface ReactRouterV6RoutesProps {
  children?: ReactNode;
  location?: Partial<ReactRouterLocation> | string;
  routesComponent?: ReactRouterV6RoutesShape;
}

export type ReactRouterV6Params<Key extends string = string> = {
  readonly [key in Key]: string | undefined;
};

export interface ReactRouterV6RouteMatch<ParamKey extends string = string> {
  params: ReactRouterV6Params<ParamKey>;
  pathname: string;
  pathnameBase: string;
  route: ReactRouterV6RouteObject;
}

export type ReactRouterV6CreateRoutesFromChildren = (children: ReactNode) => ReactRouterV6RouteObject[];

export type ReactRouterV6MatchRoutes = (
  routes: ReactRouterV6RouteObject[],
  location: Partial<ReactRouterLocation> | string,
  basename?: string | undefined
) => ReactRouterV6RouteMatch[] | null;

export type ReactRouterV6RoutesShape = (props: ReactRouterV6RoutesProps) => ReactElement | null;

export type ReactRouterV6UseLocation = () => ReactRouterLocation;

export type ReactRouterV6UseNavigationType = () => 'POP' | 'PUSH' | 'REPLACE';

export interface ReactRouterV6Dependencies {
  createRoutesFromChildren: ReactRouterV6CreateRoutesFromChildren;
  matchRoutes: ReactRouterV6MatchRoutes;
  Routes: ReactRouterV6RoutesShape;
  useLocation: ReactRouterV6UseLocation;
  useNavigationType: ReactRouterV6UseNavigationType;
}

export interface ReactRouterV6DataApiDependencies {
  matchRoutes: ReactRouterV6MatchRoutes;
}

export type EventRouteTransitionAttributes = {
  fromRoute?: string;
  fromUrl?: string;
};
