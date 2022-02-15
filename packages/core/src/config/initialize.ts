import { defaultGlobalObjectKey } from './const';
import type { Config, UserConfig } from './types';

export function initializeConfig(userConfig: UserConfig): Config {
  return {
    globalObjectKey: defaultGlobalObjectKey,
    metas: [],
    preventGlobalExposure: false,
    transports: [],
    ...userConfig,
  };
}
