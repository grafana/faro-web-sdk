import type {
  ReactRouterV4V5Dependencies,
  ReactRouterV6Dependencies,
  ReactRouterV6NextDependencies,
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

export interface ReactRouterV6NextConfig {
  version: ReactRouterVersion.V6_Next;
  dependencies: ReactRouterV6NextDependencies;
}

export interface ReactIntegrationConfig {
  router?: ReactRouterV4V5Config | ReactRouterV6Config | ReactRouterV6NextConfig;
}
