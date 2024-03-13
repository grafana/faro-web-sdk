export { initializeReactRouterInstrumentation } from './initialize';

export { NavigationType, ReactRouterVersion } from './types';
export type { ReactRouterLocation, ReactRouterHistory } from './types';

export { FaroRoute, setReactRouterV4V5SSRDependencies } from './v4v5';
export type { ReactRouterV4V5ActiveEvent, ReactRouterV4V5Dependencies, ReactRouterV4V5RouteShape } from './v4v5';

export { FaroRoutes, setReactRouterV6SSRDependencies, withFaroRouterInstrumentation } from './v6';
export type {
  ReactRouterV6CreateRoutesFromChildren,
  ReactRouterV6Dependencies,
  ReactRouterV6MatchRoutes,
  ReactRouterV6Params,
  ReactRouterV6RouteMatch,
  ReactRouterV6RouteObject,
  ReactRouterV6RoutesProps,
  ReactRouterV6RoutesShape,
  ReactRouterV6UseLocation,
  ReactRouterV6UseNavigationType,
  ReactRouterV6DataApiDependencies,
} from './v6';
