import type { Agent } from '@grafana/agent-web';

import type { ReactIntegrationConfig } from '../types';
import { ReactRouterVersion } from './types';
import { initializeReactRouterV4V5Instrumentation } from './v4v5';
import { initializeReactRouterV6Instrumentation } from './v6';

export function initializeReactRouterInstrumentation(config: ReactIntegrationConfig, agent: Agent): void {
  if (!agent.api?.isOTELInitialized()) {
    agent.internalLogger?.error(
      'The Grafana React Router instrumentation requires tracing instrumentation. Please enable it in the "instrumentations" section of your config.'
    );

    return;
  }

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
