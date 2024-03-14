import hoistNonReactStatics from 'hoist-non-react-statics';

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

export function initializeReactRouterV6DataRouterInstrumentation(
  dependencies: ReactRouterV6DataRouterDependencies
): void {
  setReactRouterV6DataRouterDependencies(dependencies);
}
