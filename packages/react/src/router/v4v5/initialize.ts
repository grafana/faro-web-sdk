import hoistNonReactStatics from 'hoist-non-react-statics';
import type { FunctionComponent } from 'react';

import { globalObject } from '@grafana/faro-web-sdk';
import type { Agent } from '@grafana/faro-web-sdk';

import { NavigationType } from '../types';
import { createNewActiveEvent, sendActiveEvent } from './activeEvent';
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

  createNewActiveEvent(globalObject.location?.href);

  dependencies.history.listen?.((_location, action) => {
    if (action === NavigationType.Push || action === NavigationType.Pop) {
      sendActiveEvent();

      createNewActiveEvent(globalObject.location?.href);
    }
  });
}
