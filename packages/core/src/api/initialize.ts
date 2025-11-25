import type { Config } from '../config';
import type { InternalLogger } from '../internalLogger';
import type { Metas } from '../metas';
import type { Transports } from '../transports';
import type { UnpatchedConsole } from '../unpatchedConsole';

import { initializeEventsAPI } from './events';
import type { EventsAPI } from './events/types';
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

  // Create a deferred pushEvent function that will be set once events API is initialized
  let pushEventImpl: EventsAPI['pushEvent'] | null = null;
  const pushEventWrapper: EventsAPI['pushEvent'] = (name, attributes, domain, options) => {
    if (pushEventImpl) {
      pushEventImpl(name, attributes, domain, options);
    } else {
      internalLogger.warn('pushEventImpl is not initialized. Event dropped:', { name, attributes, domain, options });
    }
  };

  // Initialize user actions API with the wrapper function
  const userActionsApi = initializeUserActionsAPI({
    transports,
    config,
    internalLogger,
    pushEvent: pushEventWrapper,
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

  // Initialize events API and set the actual implementation
  const eventsApi = initializeEventsAPI(props);
  pushEventImpl = eventsApi.pushEvent;

  return {
    ...tracesApi,
    ...initializeExceptionsAPI(props),
    ...initializeMetaAPI(props),
    ...initializeLogsAPI(props),
    ...initializeMeasurementsAPI(props),
    ...eventsApi,
    ...userActionsApi,
  };
}
