import hoistNonReactStatics from 'hoist-non-react-statics';

import { FaroRoutes } from './FaroRoutes';
import { setReactRouterV6Dependencies } from './routerDependencies';
import type { ReactRouterV6Dependencies } from './types';

export function initializeReactRouterV6Instrumentation(dependencies: ReactRouterV6Dependencies): void {
  hoistNonReactStatics(FaroRoutes, dependencies.Routes);

  setReactRouterV6Dependencies(dependencies);
}
