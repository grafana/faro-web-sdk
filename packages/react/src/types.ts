import type {
  ReactRouterV4V5Dependencies,
  ReactRouterV6DataRouterDependencies,
  ReactRouterV6Dependencies,
  ReactRouterVersion,
} from './router';

export interface ReactRouterV4V5Config {
  version: ReactRouterVersion.V4 | ReactRouterVersion.V5;
  dependencies: ReactRouterV4V5Dependencies;
}

export interface ReactRouterV6Config {
  version: ReactRouterVersion.V6;
  dependencies: ReactRouterV6Dependencies;
}

export interface ReactRouterV6DataRouterConfig {
  version: ReactRouterVersion.V6_data_router;
  dependencies: ReactRouterV6DataRouterDependencies;
}

export interface ReactIntegrationConfig {
  router?: ReactRouterV4V5Config | ReactRouterV6Config | ReactRouterV6DataRouterConfig;
}
