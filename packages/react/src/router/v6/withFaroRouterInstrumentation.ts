import { EVENT_ROUTE_CHANGE, globalObject } from '@grafana/faro-web-sdk';

import { api } from '../../dependencies';
import { NavigationType, ReactRouterLocation } from '../types';

import { isInitialized } from './routerDependencies';
import type { EventRouteTransitionAttributes, ReactRouterV6RouteObject } from './types';
import { getRouteFromLocation } from './utils';

interface RouterState {
  historyAction: NavigationType | any;
  location: ReactRouterLocation;
}

interface Router {
  state: RouterState;
  routes: ReactRouterV6RouteObject[];
  subscribe(fn: (state: RouterState) => void): () => void;
}

/**
 * To use with React Router 6.4 data APIs.
 */
export function withFaroRouterInstrumentation<R extends Router = Router>(router: R) {
  let lastRoute: EventRouteTransitionAttributes = {};

  router.subscribe((state) => {
    const navigationType: NavigationType = state.historyAction;
    const location = state.location;
    const routes = router.routes;

    if (isInitialized && (navigationType === NavigationType.Push || navigationType === NavigationType.Pop)) {
      const route = getRouteFromLocation(routes, location);
      const url = globalObject.location?.href;

      api.pushEvent(EVENT_ROUTE_CHANGE, {
        toRoute: route,
        toUrl: globalObject.location?.href,
        ...lastRoute,
      });

      lastRoute = {
        fromRoute: route,
        fromUrl: url,
      };
    }
  });

  return router;
}
