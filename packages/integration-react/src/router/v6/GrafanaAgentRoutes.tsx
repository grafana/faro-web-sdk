import { globalObject, VERSION } from '@grafana/agent-web';
import type { Span } from '@opentelemetry/api';
import { SemanticAttributes } from '@opentelemetry/semantic-conventions';
import { useEffect, useMemo, useRef } from 'react';

import { NavigationType } from '../types';
import { agent, createRoutesFromChildren, isInitialized, Routes, useLocation, useNavigationType } from './dependencies';
import type { ReactRouterV6RoutesProps } from './types';
import { getRouteFromLocation } from './utils';

export function GrafanaAgentRoutes(props: ReactRouterV6RoutesProps) {
  const location = useLocation?.();
  const navigationType = useNavigationType?.();

  const routes = useMemo(() => createRoutesFromChildren?.(props.children) ?? [], [props.children]);

  const activeSpan = useRef<Span | undefined>();

  useEffect(() => {
    const canRun = (isInitialized && agent.api.isOTELInitialized()) ?? false;

    if (canRun && (navigationType === NavigationType.Push || navigationType === NavigationType.Pop)) {
      if (activeSpan.current) {
        activeSpan.current.end();
      }

      const otel = agent.api.getOTEL()!;
      const tracer = otel.trace.getTracer('@grafana/agent-integration-react', VERSION)!;

      const span = tracer.startSpan('routeChange', {
        attributes: {
          [SemanticAttributes.HTTP_URL]: globalObject.location?.href,
          [SemanticAttributes.HTTP_ROUTE]: getRouteFromLocation(routes, location),
        },
      });

      otel.trace.setSpan(otel.context.active(), span);

      activeSpan.current = span;
    }
  }, [location, navigationType, routes]);

  const ActualRoutes = props.routesComponent ?? Routes;

  return <ActualRoutes {...props} />;
}
