import { useEffect, useMemo } from 'react';

import { globalObject } from '@grafana/faro-web-sdk';

import { NavigationType } from '../types';
import { createRoutesFromChildren, faro, isInitialized, Routes, useLocation, useNavigationType } from './dependencies';
import type { ReactRouterV6RoutesProps } from './types';
import { getRouteFromLocation } from './utils';

export function FaroRoutes(props: ReactRouterV6RoutesProps) {
  const location = useLocation?.();
  const navigationType = useNavigationType?.();

  const routes = useMemo(() => createRoutesFromChildren?.(props.children) ?? [], [props.children]);

  useEffect(() => {
    if (isInitialized && (navigationType === NavigationType.Push || navigationType === NavigationType.Pop)) {
      faro.api.pushEvent('routeChange', {
        url: globalObject.location?.href,
        route: getRouteFromLocation(routes, location),
      });
    }
  }, [location, navigationType, routes]);

  const ActualRoutes = props.routesComponent ?? Routes;

  return <ActualRoutes {...props} />;
}
