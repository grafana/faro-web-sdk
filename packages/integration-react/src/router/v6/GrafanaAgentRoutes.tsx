import { useEffect, useMemo } from 'react';

import { globalObject } from '@grafana/agent-web';

import { NavigationType } from '../types';
import { agent, createRoutesFromChildren, isInitialized, Routes, useLocation, useNavigationType } from './dependencies';
import type { ReactRouterV6RoutesProps } from './types';
import { getRouteFromLocation } from './utils';

export function GrafanaAgentRoutes(props: ReactRouterV6RoutesProps) {
  const location = useLocation?.();
  const navigationType = useNavigationType?.();

  const routes = useMemo(() => createRoutesFromChildren?.(props.children) ?? [], [props.children]);

  useEffect(() => {
    if (isInitialized && (navigationType === NavigationType.Push || navigationType === NavigationType.Pop)) {
      agent.api.pushEvent('routeChange', {
        url: globalObject.location?.href,
        route: getRouteFromLocation(routes, location),
      });
    }
  }, [location, navigationType, routes]);

  const ActualRoutes = props.routesComponent ?? Routes;

  return <ActualRoutes {...props} />;
}
