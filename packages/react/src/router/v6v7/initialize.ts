import hoistNonReactStatics from 'hoist-non-react-statics';

import type {
  ReactRouterV6Config,
  ReactRouterV6DataRouterConfig,
  ReactRouterV7Config,
  ReactRouterV7DataRouterConfig,
} from '../../types';
import { ReactRouterVersion } from '../types';

import { FaroRoutes } from './FaroRoutes';
import { setReactRouterV6DataRouterDependencies, setReactRouterV6Dependencies } from './routerDependencies';
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

export function createReactRouterV7Options(dependencies: ReactRouterV6Dependencies): ReactRouterV7Config {
  return {
    version: ReactRouterVersion.V7,
    dependencies,
  };
}

export function createReactRouterV7DataOptions(
  dependencies: ReactRouterV6DataRouterDependencies
): ReactRouterV7DataRouterConfig {
  return {
    version: ReactRouterVersion.V7_data_router,
    dependencies,
  };
}
