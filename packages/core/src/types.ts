import type { API } from './api';
import type { Config } from './config';
import type { Metas } from './metas';
import type { Transports } from './transports';

export interface Agent {
  api: API;
  config: Config;
  metas: Metas;
  transports: Transports;
}
