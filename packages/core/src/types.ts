import type { API } from './api';
import type { Config } from './config';
import type { Meta } from './meta';
import type { Transports } from './transports';

export interface Agent {
  api: API;
  config: Config;
  meta: Meta;
  transports: Transports;
}
