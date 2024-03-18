import { internalLogger } from '../dependencies';
import type { ReactIntegrationConfig } from '../types';

import { ReactRouterVersion } from './types';
import { initializeReactRouterV4V5Instrumentation } from './v4v5';
import { initializeReactRouterV6DataRouterInstrumentation, initializeReactRouterV6Instrumentation } from './v6';

export function initializeReactRouterInstrumentation(options: ReactIntegrationConfig): void {
  const initMessage = 'Initializing React Router';

  switch (options.router?.version) {
    case ReactRouterVersion.V6:
      internalLogger.debug(`${initMessage} V6 instrumentation`);
      initializeReactRouterV6Instrumentation(options.router.dependencies);
      break;

    case ReactRouterVersion.V6_data_router:
      internalLogger.debug(`${initMessage} V6 data router instrumentation`);
      initializeReactRouterV6DataRouterInstrumentation(options.router.dependencies);
      break;

    case ReactRouterVersion.V5:
    case ReactRouterVersion.V4:
      internalLogger.debug(`${initMessage} ${options.router.version} instrumentation`);
      initializeReactRouterV4V5Instrumentation(options.router.dependencies);
      break;

    default:
      internalLogger.debug('Skipping initialization of React Router instrumentation');
  }
}
