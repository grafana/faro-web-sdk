import hoistNonReactStatics from 'hoist-non-react-statics';

import type { Agent } from '@grafana/faro-web-sdk';

import { setDependencies } from './dependencies';
import { GrafanaAgentRoutes } from './GrafanaAgentRoutes';
import type { ReactRouterV6Dependencies } from './types';

export function initializeReactRouterV6Instrumentation(dependencies: ReactRouterV6Dependencies, agent: Agent): void {
  hoistNonReactStatics(GrafanaAgentRoutes, dependencies.Routes);

  setDependencies(dependencies, agent);
}
