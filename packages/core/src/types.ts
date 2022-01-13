import type { Commander } from './commander';
import type { Config } from './config';
import type { Meta } from './meta';
import type { Transports } from './transports';

export interface Agent {
  config: Config;
  commander: Commander;
  meta: Meta;
  transports: Transports;
}
