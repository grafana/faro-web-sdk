import type { Instrumentation } from '../instrumentations';
import type { Meta } from '../metas';
import type { Transport } from '../transports';

export interface Config {
  globalObjectKey: string;
  instrumentations: Instrumentation[];
  metas: Meta[];
  preventGlobalExposure: boolean;
  transports: Transport[];
}

export type UserConfig = Partial<Config> & Pick<Config, 'instrumentations'>;
