import type { API } from '../api';
import type { Config } from '../config';
import type { Instrumentations } from '../instrumentations';
import type { InternalLogger } from '../internalLogger';
import type { Metas } from '../metas';
import type { Transports } from '../transports';
import type { UnpatchedConsole } from '../unpatchedConsole';

import { setFaroOnGlobalObject } from './faroGlobalObject';
import { setInternalFaroOnGlobalObject } from './internalFaroGlobalObject';
import type { Faro } from './types';

export let faro: Faro = {} as Faro;

export function registerFaro(
  unpatchedConsole: UnpatchedConsole,
  internalLogger: InternalLogger,
  config: Config,
  metas: Metas,
  transports: Transports,
  api: API,
  instrumentations: Instrumentations
): Faro {
  internalLogger.debug('Initializing Faro');

  faro = {
    api,
    config,
    instrumentations,
    internalLogger,
    metas,
    pause: transports.pause,
    transports,
    unpatchedConsole,
    unpause: transports.unpause,
  };

  setInternalFaroOnGlobalObject(faro);

  setFaroOnGlobalObject(faro);

  return faro;
}
