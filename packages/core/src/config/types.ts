import type { Plugin } from '../plugins';
import type { Transport } from '../transports';

export interface Config {
  globalObjectKey: string;
  plugins: Plugin[];
  preventGlobalExposure: boolean;
  transports: Transport[];
}

export type UserConfig = Partial<Config> & Pick<Config, 'plugins'>;
