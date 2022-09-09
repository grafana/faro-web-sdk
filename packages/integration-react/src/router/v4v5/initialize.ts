import hoistNonReactStatics from 'hoist-non-react-statics';
import type { FunctionComponent } from 'react';

import type { Agent } from '@grafana/agent-web';

import { NavigationType } from '../types';
import { activeSpan, createNewActiveSpan } from './activeSpan';
import { setDependencies } from './dependencies';
import { GrafanaAgentRoute } from './GrafanaAgentRoute';
import type { ReactRouterV4V5Dependencies } from './types';

export function initializeReactRouterV4V5Instrumentation(
  dependencies: ReactRouterV4V5Dependencies,
  agent: Agent
): void {
  const Route = dependencies.Route as FunctionComponent;
  const componentDisplayName = Route.displayName ?? Route.name;
  (GrafanaAgentRoute as FunctionComponent).displayName = `grafanaAgentRoute(${componentDisplayName})`;
  hoistNonReactStatics(GrafanaAgentRoute, Route);

  setDependencies(dependencies, agent);

  createNewActiveSpan();

  dependencies.history.listen?.((_location, action) => {
    if (action === NavigationType.Push || action === NavigationType.Pop) {
      if (activeSpan) {
        activeSpan.end();
      }

      createNewActiveSpan();
    }
  });
}
