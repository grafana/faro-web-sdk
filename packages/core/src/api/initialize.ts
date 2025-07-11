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
import { initializeUserActionsAPI } from './userActions';

export function initializeAPI(
  unpatchedConsole: UnpatchedConsole,
  internalLogger: InternalLogger,
  config: Config,
  metas: Metas,
  transports: Transports
): API {
  internalLogger.debug('Initializing API');

  const userActionsApi = initializeUserActionsAPI({
    transports,
    config,
    internalLogger,
  });

  const tracesApi = initializeTracesAPI(unpatchedConsole, internalLogger, config, metas, transports);

  const props = {
    unpatchedConsole,
    internalLogger,
    userActionsApi,
    config,
    metas,
    transports,
    tracesApi,
  };

  return {
    ...tracesApi,
    ...initializeExceptionsAPI(props),
    ...initializeMetaAPI(props),
    ...initializeLogsAPI(props),
    ...initializeMeasurementsAPI(props),
    ...initializeEventsAPI(props),
    ...userActionsApi,
  };
}
