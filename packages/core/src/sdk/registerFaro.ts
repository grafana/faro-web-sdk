import type { API } from '../api';
import { getNoopAPI } from '../api/noop';
import type { Config } from '../config';
import type { Instrumentations } from '../instrumentations';
import type { InternalLogger } from '../internalLogger';
import type { Metas } from '../metas';
import type { Transports } from '../transports';
import type { UnpatchedConsole } from '../unpatchedConsole';

import { setFaroOnGlobalObject } from './faroGlobalObject';
import { setInternalFaroOnGlobalObject } from './internalFaroGlobalObject';
import type { Faro } from './types';

export let faro: Faro = { api: getNoopAPI() } as Faro;
let hasNonIsolatedInstance = false;

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

  const instance: Faro = {
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

  // Track the singleton for this module copy independently of the shared global marker.
  if (!config.isolate) {
    hasNonIsolatedInstance = true;
  }

  if (!config.isolate || !hasNonIsolatedInstance) {
    faro = instance;
  }

  setInternalFaroOnGlobalObject(instance);

  setFaroOnGlobalObject(instance);

  return instance;
}
