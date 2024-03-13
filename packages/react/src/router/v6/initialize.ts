import hoistNonReactStatics from 'hoist-non-react-statics';

import { FaroRoutes } from './FaroRoutes';
import { setReactRouterV6DataApiDependencies, setReactRouterV6Dependencies } from './routerDependencies';
import type { ReactRouterV6DataApiDependencies, ReactRouterV6Dependencies } from './types';

export function initializeReactRouterV6Instrumentation(dependencies: ReactRouterV6Dependencies): void {
  hoistNonReactStatics(FaroRoutes, dependencies.Routes);
  setReactRouterV6Dependencies(dependencies);
}

export function initializeReactRouterV6DataApiInstrumentation(dependencies: ReactRouterV6DataApiDependencies): void {
  setReactRouterV6DataApiDependencies(dependencies);
}
