import type { Config } from '../config';
import type { InternalLogger } from '../internalLogger';
import type { Metas } from '../metas';
import type { Transports } from '../transports';
import type { UnpatchedConsole } from '../unpatchedConsole';
import { Observable } from '../utils';

import { initializeEventsAPI } from './events';
import { initializeExceptionsAPI } from './exceptions';
import { initializeLogsAPI } from './logs';
import { initializeMeasurementsAPI } from './measurements';
import { initializeMetaAPI } from './meta';
import { initializeTracesAPI } from './traces';
import type { API, ApiMessageBusMessages } from './types';
import { createUserActionLifecycleHandler } from './userActionLifecycleHandler';

export const apiMessageBus = new Observable<ApiMessageBusMessages>();

export function initializeAPI(
  unpatchedConsole: UnpatchedConsole,
  internalLogger: InternalLogger,
  config: Config,
  metas: Metas,
  transports: Transports
): API {
  internalLogger.debug('Initializing API');

  const { actionBuffer, getMessage } = createUserActionLifecycleHandler(apiMessageBus, transports);

  const tracesApi = initializeTracesAPI(unpatchedConsole, internalLogger, config, metas, transports);

  const props = {
    unpatchedConsole,
    internalLogger,
    config,
    metas,
    transports,
    tracesApi,
    actionBuffer,
    getMessage,
  };

  return {
    ...tracesApi,
    ...initializeExceptionsAPI(props),
    ...initializeMetaAPI(props),
    ...initializeLogsAPI(props),
    ...initializeMeasurementsAPI(props),
    ...initializeEventsAPI(props),
  };
}
