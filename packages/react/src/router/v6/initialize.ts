import hoistNonReactStatics from 'hoist-non-react-statics';

import type { ReactRouterV6Config, ReactRouterV6DataRouterConfig } from '../../types';
import { ReactRouterVersion } from '../types';

import { FaroRoutes } from './FaroRoutes';
import {
  setReactRouterV6DataRouterDependencies as setReactRouterV6DataRouterDependencies,
  setReactRouterV6Dependencies,
} from './routerDependencies';
import type { ReactRouterV6DataRouterDependencies, ReactRouterV6Dependencies } from './types';

export function initializeReactRouterV6Instrumentation(dependencies: ReactRouterV6Dependencies): void {
  hoistNonReactStatics(FaroRoutes, dependencies.Routes);
  setReactRouterV6Dependencies(dependencies);
}

export function createReactRouterV6Options(dependencies: ReactRouterV6Dependencies): ReactRouterV6Config {
  return {
    version: ReactRouterVersion.V6,
    dependencies,
  };
}

export function initializeReactRouterV6DataRouterInstrumentation(
  dependencies: ReactRouterV6DataRouterDependencies
): void {
  setReactRouterV6DataRouterDependencies(dependencies);
}

export function createReactRouterV6DataOptions(
  dependencies: ReactRouterV6DataRouterDependencies
): ReactRouterV6DataRouterConfig {
  return {
    version: ReactRouterVersion.V6_data_router,
    dependencies,
  };
}
