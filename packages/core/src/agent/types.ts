import type { API } from '../api';
import type { Config } from '../config';
import type { InternalLogger } from '../internalLogger';
import type { Metas } from '../metas';
import type { Transports } from '../transports';

export interface Agent {
  api: API;
  config: Config;
  internalLogger: InternalLogger;
  metas: Metas;
  originalConsole: Console;
  pause: Transports['pause'];
  transports: Transports;
  unpause: Transports['unpause'];
}
