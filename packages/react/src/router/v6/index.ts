export { FaroRoutes } from './FaroRoutes';

export {
  createReactRouterV6Options,
  createReactRouterV6DataOptions,
  initializeReactRouterV6Instrumentation,
  initializeReactRouterV6DataRouterInstrumentation,
} from './initialize';

export { setReactRouterV6SSRDependencies } from './routerDependencies';

export { withFaroRouterInstrumentation } from './withFaroRouterInstrumentation';

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
  ReactRouterV6DataRouterDependencies,
} from './types';
