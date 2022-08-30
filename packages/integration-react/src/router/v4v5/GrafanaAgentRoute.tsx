import { activeSpan, setHttpRouteAttribute } from './activeSpan';
import { Route } from './dependencies';
import type { ReactRouterV4V5RouteProps } from './types';

export function GrafanaAgentRoute(props: ReactRouterV4V5RouteProps) {
  if (activeSpan && props?.computedMatch?.isExact) {
    setHttpRouteAttribute(props.computedMatch.path);
  }

  return <Route {...props} />;
}
