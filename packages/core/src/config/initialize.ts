import { defaultGlobalObjectKey } from './const';
import type { Config, UserConfig } from './types';

export function initializeConfig(userConfig: UserConfig): Config {
  return {
    globalObjectKey: defaultGlobalObjectKey,
    preventGlobalExposure: false,
    transports: [],
    ...userConfig,
  };
}
