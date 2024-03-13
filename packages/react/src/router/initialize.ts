import { internalLogger } from '../dependencies';
import type { ReactIntegrationConfig } from '../types';

import { ReactRouterVersion } from './types';
import { initializeReactRouterV4V5Instrumentation } from './v4v5';
import { initializeReactRouterV6Instrumentation, initializeReactRouterV6NextInstrumentation } from './v6';

export function initializeReactRouterInstrumentation(options: ReactIntegrationConfig): void {
  switch (options.router?.version) {
    case ReactRouterVersion.V6:
      internalLogger.debug('Initializing React Router V6 instrumentation');
      initializeReactRouterV6Instrumentation(options.router.dependencies);
      break;

    case ReactRouterVersion.V6_Next:
      internalLogger.debug('Initializing React Router V6 instrumentation');
      initializeReactRouterV6NextInstrumentation(options.router.dependencies);
      break;

    case ReactRouterVersion.V5:
    case ReactRouterVersion.V4:
      internalLogger.debug(`Initializing React Router ${options.router.version} instrumentation`);
      initializeReactRouterV4V5Instrumentation(options.router.dependencies);
      break;

    default:
      internalLogger.debug('Skipping initialization of React Router instrumentation');
  }
}
