import { defaultglobalObjectKey } from './const';
import type { Config, UserConfig } from './types';

export function initializeConfig(userConfig: UserConfig): Config {
  return {
    globalObjectKey: defaultglobalObjectKey,
    preventGlobalExposure: false,
    transports: [],
    ...userConfig,
  };
}
