import hoistNonReactStatics from 'hoist-non-react-statics';

import type { Faro } from '@grafana/faro-web-sdk';

import { setDependencies } from './dependencies';
import { FaroRoutes } from './FaroRoutes';
import type { ReactRouterV6Dependencies } from './types';

export function initializeReactRouterV6Instrumentation(dependencies: ReactRouterV6Dependencies, faro: Faro): void {
  hoistNonReactStatics(FaroRoutes, dependencies.Routes);

  setDependencies(dependencies, faro);
}
