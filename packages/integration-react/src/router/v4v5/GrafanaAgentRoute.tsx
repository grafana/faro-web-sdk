import { setActiveEventRoute } from './activeEvent';
import { Route } from './dependencies';
import type { ReactRouterV4V5RouteProps } from './types';

export function GrafanaAgentRoute(props: ReactRouterV4V5RouteProps) {
  if (props?.computedMatch?.isExact) {
    setActiveEventRoute(props.computedMatch.path);
  }

  return <Route {...props} />;
}
