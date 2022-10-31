import type { API } from '../api';
import type { Config } from '../config';
import type { Instrumentations } from '../instrumentations';
import type { InternalLogger } from '../internalLogger';
import type { Metas } from '../metas';
import type { Transports } from '../transports';
import type { UnpatchedConsole } from '../unpatchedConsole';

export interface Faro {
  api: API;
  config: Config;
  instrumentations: Instrumentations;
  internalLogger: InternalLogger;
  metas: Metas;
  pause: Transports['pause'];
  transports: Transports;
  unpatchedConsole: UnpatchedConsole;
  unpause: Transports['unpause'];
}
