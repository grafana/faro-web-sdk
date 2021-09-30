import { Config, UserConfig } from './types';

export let config: Config = null!;

export function initializeConfig(userConfig: UserConfig) {
  config = {
    preventWindowExposure: false,
    windowObjectKey: 'grafanaFEAgent',
    ...userConfig,
  };
}
