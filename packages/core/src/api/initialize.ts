import type { Config } from '../config';
import type { InternalLogger } from '../internalLogger';
import type { Metas } from '../metas';
import type { Transports } from '../transports';
import type { UnpatchedConsole } from '../unpatchedConsole';

import { initializeEventsAPI } from './events';
import { initializeExceptionsAPI } from './exceptions';
import { initializeLogsAPI } from './logs';
import { initializeMeasurementsAPI } from './measurements';
import { initializeMetaAPI } from './meta';
import { initializeTracesAPI } from './traces';
import type { API } from './types';

export function initializeAPI(
  unpatchedConsole: UnpatchedConsole,
  internalLogger: InternalLogger,
  config: Config,
  metas: Metas,
  transports: Transports
): API {
  internalLogger.debug('Initializing API');

  const tracesApi = initializeTracesAPI(unpatchedConsole, internalLogger, config, metas, transports);

  return {
    ...tracesApi,
    ...initializeExceptionsAPI(unpatchedConsole, internalLogger, config, metas, transports, tracesApi),
    ...initializeMetaAPI(unpatchedConsole, internalLogger, config, metas, transports),
    ...initializeLogsAPI(unpatchedConsole, internalLogger, config, metas, transports, tracesApi),
    ...initializeMeasurementsAPI(unpatchedConsole, internalLogger, config, metas, transports, tracesApi),
    ...initializeEventsAPI(unpatchedConsole, internalLogger, config, metas, transports, tracesApi),
  };
}
