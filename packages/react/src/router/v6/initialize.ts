import hoistNonReactStatics from 'hoist-non-react-statics';

import { FaroRoutes } from './FaroRoutes';
import { setReactRouterV6Dependencies, setReactRouterV6NextDependencies } from './routerDependencies';
import type { ReactRouterV6Dependencies, ReactRouterV6NextDependencies } from './types';

export function initializeReactRouterV6Instrumentation(dependencies: ReactRouterV6Dependencies): void {
  hoistNonReactStatics(FaroRoutes, dependencies.Routes);
  setReactRouterV6Dependencies(dependencies);
}

export function initializeReactRouterNextV6Instrumentation(dependencies: ReactRouterV6NextDependencies): void {
  setReactRouterV6NextDependencies(dependencies);
}
