import type { Agent } from '@grafana/faro-web-sdk';

import type { ReactIntegrationConfig } from '../types';
import { ReactRouterVersion } from './types';
import { initializeReactRouterV4V5Instrumentation } from './v4v5';
import { initializeReactRouterV6Instrumentation } from './v6';

export function initializeReactRouterInstrumentation(config: ReactIntegrationConfig, agent: Agent): void {
  switch (config.router?.version) {
    case ReactRouterVersion.V6:
      agent.internalLogger.debug('Initializing React Router V6 instrumentation');
      initializeReactRouterV6Instrumentation(config.router.dependencies, agent);
      break;

    case ReactRouterVersion.V5:
    case ReactRouterVersion.V4:
      agent.internalLogger.debug(`Initializing React Router ${config.router.version} instrumentation`);
      initializeReactRouterV4V5Instrumentation(config.router.dependencies, agent);
      break;

    default:
      agent.internalLogger.debug('Skipping initialization of React Router instrumentation');
  }
}
