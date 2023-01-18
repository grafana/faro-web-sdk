import { useEffect, useMemo } from 'react';

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

  useEffect(() => {
    if (isInitialized && (navigationType === NavigationType.Push || navigationType === NavigationType.Pop)) {
      api.pushEvent('routeChange', {
        route: getRouteFromLocation(routes, location),
        url: globalObject.location?.href,
      });
    }
  }, [location, navigationType, routes]);

  const ActualRoutes = props.routesComponent ?? Routes;

  return <ActualRoutes {...props} />;
}
