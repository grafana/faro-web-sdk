import hoistNonReactStatics from 'hoist-non-react-statics';
import type { FunctionComponent } from 'react';

import { globalObject } from '@grafana/faro-web-sdk';

import { NavigationType } from '../types';

import { createNewActiveEvent, sendActiveEvent } from './activeEvent';
import { FaroRoute } from './FaroRoute';
import { setReactRouterV4V5Dependencies } from './routerDependencies';
import type { ReactRouterV4V5Dependencies } from './types';

export function initializeReactRouterV4V5Instrumentation(dependencies: ReactRouterV4V5Dependencies): void {
  const Route = dependencies.Route as FunctionComponent;
  const componentDisplayName = Route.displayName ?? Route.name;
  (FaroRoute as FunctionComponent).displayName = `faroRoute(${componentDisplayName})`;
  hoistNonReactStatics(FaroRoute, Route);

  setReactRouterV4V5Dependencies(dependencies);

  createNewActiveEvent(globalObject.location?.href);

  dependencies.history.listen?.((_location, action) => {
    if (action === NavigationType.Push || action === NavigationType.Pop) {
      sendActiveEvent();

      createNewActiveEvent(globalObject.location?.href);
    }
  });
}
