import hoistNonReactStatics from 'hoist-non-react-statics';
import type { FunctionComponent } from 'react';

import { globalObject } from '@grafana/faro-web-sdk';

import type { ReactRouterV4V5Config } from '../../types';
import { NavigationType, ReactRouterVersion } from '../types';

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

export function createReactRouterV4Options(dependencies: ReactRouterV4V5Dependencies): ReactRouterV4V5Config {
  return {
    version: ReactRouterVersion.V4,
    dependencies,
  };
}

export function createReactRouterV5Options(dependencies: ReactRouterV4V5Dependencies): ReactRouterV4V5Config {
  return {
    version: ReactRouterVersion.V5,
    dependencies,
  };
}
