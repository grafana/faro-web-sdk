import type { ApiHandler } from './api';
import type { Plugin } from './plugins';

export interface Config {
  apiHandlers: ApiHandler[];
  plugins: Plugin[];
  preventWindowExposure: boolean;
  windowObjectKey: string;
}

export type UserConfig = Partial<Config> & Pick<Config, 'plugins'>;

export let config: Config = null!;

export function initializeConfig(userConfig: UserConfig): void {
  config = {
    apiHandlers: [],
    preventWindowExposure: false,
    windowObjectKey: 'grafanaFEAgent',
    ...userConfig,
  };
}
