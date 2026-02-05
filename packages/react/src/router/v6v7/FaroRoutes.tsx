import { useEffect, useMemo, useRef } from 'react';

import { EVENT_ROUTE_CHANGE, globalObject } from '@grafana/faro-web-sdk';

import { api } from '../../dependencies';
import { NavigationType } from '../types';

import { createRoutesFromChildren, isInitialized, Routes, useLocation, useNavigationType } from './routerDependencies';
import type { EventRouteTransitionAttributes, ReactRouterV6RoutesProps } from './types';
import { getRouteFromLocation } from './utils';

export function FaroRoutes(props: ReactRouterV6RoutesProps) {
  const location = useLocation?.();
  const navigationType = useNavigationType?.();

  const routes = useMemo(() => createRoutesFromChildren?.(props.children) ?? [], [props.children]);

  const lastRouteRef = useRef<EventRouteTransitionAttributes>({});

  useEffect(() => {
    if (isInitialized && (navigationType === NavigationType.Push || navigationType === NavigationType.Pop)) {
      const route = getRouteFromLocation(routes, location);
      const url = globalObject.location?.href;

      api.pushEvent(EVENT_ROUTE_CHANGE, {
        toRoute: route,
        toUrl: globalObject.location?.href,
        ...lastRouteRef.current,
      });

      lastRouteRef.current = {
        fromRoute: route,
        fromUrl: url,
      };
    }
  }, [location, navigationType, routes]);

  const ActualRoutes = props.routesComponent ?? Routes;

  return <ActualRoutes {...props} />;
}
