import type { API } from '../api';
import type { Config } from '../config';
import type { InternalLogger } from '../internalLogger';
import type { Metas } from '../metas';
import type { Transports } from '../transports';
import type { UnpatchedConsole } from '../unpatchedConsole';

export interface Agent {
  api: API;
  config: Config;
  internalLogger: InternalLogger;
  metas: Metas;
  pause: Transports['pause'];
  transports: Transports;
  unpatchedConsole: UnpatchedConsole;
  unpause: Transports['unpause'];
}
