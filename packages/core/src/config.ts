import type { Plugin } from './plugins';

export interface Config {
  plugins: Plugin[];
  preventWindowExposure: boolean;
  receiverUrl: string;
  windowObjectKey: string;
}

export type UserConfig = Partial<Config> & Pick<Config, 'plugins' | 'receiverUrl'>;

export let config: Config = null!;

export function initializeConfig(userConfig: UserConfig): void {
  config = {
    preventWindowExposure: false,
    windowObjectKey: 'grafanaFEAgent',
    ...userConfig,
  };
}
