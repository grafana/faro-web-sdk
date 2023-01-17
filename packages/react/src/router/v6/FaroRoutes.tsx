import { useEffect, useMemo, useState } from 'react';

import { globalObject } from '@grafana/faro-web-sdk';

import { api } from '../../dependencies';
import { NavigationType } from '../types';

import { createRoutesFromChildren, isInitialized, Routes, useLocation, useNavigationType } from './routerDependencies';
import type { ReactRouterV6RoutesProps } from './types';
import { getRouteFromLocation } from './utils';

export function FaroRoutes(props: ReactRouterV6RoutesProps) {
  const location = useLocation?.();
  const navigationType = useNavigationType?.();

  const routes = useMemo(() => createRoutesFromChildren?.(props.children) ?? [], [props.children]);

  const [prevRoute, setPrevRoute] = useState<{ route: string; url: string }>({ route: '', url: '' });

  useEffect(() => {
    if (isInitialized && (navigationType === NavigationType.Push || navigationType === NavigationType.Pop)) {
      const payload = {
        route: getRouteFromLocation(routes, location),
        url: globalObject.location?.href,
      };

      api.pushEvent('routeChange', {
        prevRoute: prevRoute.route,
        prevUrl: prevRoute.url,
        ...payload,
      });

      setPrevRoute(payload);
    }
  }, [location, navigationType, prevRoute.route, prevRoute.url, routes]);

  const ActualRoutes = props.routesComponent ?? Routes;

  return <ActualRoutes {...props} />;
}
