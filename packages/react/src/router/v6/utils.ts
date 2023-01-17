import type { ReactRouterLocation } from '../types';

import { matchRoutes } from './routerDependencies';
import type { ReactRouterV6RouteObject } from './types';

export function getNumberOfUrlSegments(url: string): number {
  return url.split(/\\?\//).filter((currentSegment) => currentSegment.length > 0 && currentSegment !== ',').length;
}

export function getRouteFromLocation(routes: ReactRouterV6RouteObject[], location: ReactRouterLocation): string {
  if (!routes || routes.length === 0) {
    return location.pathname;
  }

  const matchedRoutes = matchRoutes(routes, location);

  let pathBuilder = '';

  if (matchedRoutes) {
    for (let x = 0; x < matchedRoutes.length; x++) {
      const branch = matchedRoutes[x]!;
      const route = branch.route;

      if (route) {
        if (route.index) {
          return branch.pathname;
        }

        let path = route.path;

        if (path) {
          path = path.startsWith('/') ? path : `/${path}`;

          pathBuilder += path;

          if (branch.pathname === location.pathname) {
            if (getNumberOfUrlSegments(pathBuilder) !== getNumberOfUrlSegments(branch.pathname)) {
              return path;
            }

            return pathBuilder;
          }
        }
      }
    }
  }

  return location.pathname;
}
