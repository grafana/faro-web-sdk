import type { Config } from '../config';
import type { InternalLogger } from '../internalLogger';
import type { Metas } from '../metas';
import type { Transports } from '../transports';
import { initializeEventsAPI } from './events';
import { initializeExceptionsAPI } from './exceptions';
import { initializeLogsAPI } from './logs';
import { initializeMeasurementsAPI } from './measurements';
import { initializeMetaAPI } from './meta';
import { initializeTracesAPI } from './traces';
import { initializeTransportsAPI } from './transports';
import type { API } from './types';

export function initializeAPI(
  internalLogger: InternalLogger,
  config: Config,
  transports: Transports,
  metas: Metas
): API {
  internalLogger.debug('Initializing API');

  const tracesApi = initializeTracesAPI(internalLogger, config, transports, metas);

  return {
    ...tracesApi,
    ...initializeExceptionsAPI(internalLogger, config, transports, metas, tracesApi),
    ...initializeMetaAPI(internalLogger, config, transports, metas),
    ...initializeLogsAPI(internalLogger, config, transports, metas, tracesApi),
    ...initializeMeasurementsAPI(internalLogger, config, transports, metas, tracesApi),
    ...initializeEventsAPI(internalLogger, config, transports, metas, tracesApi),
    ...initializeTransportsAPI(internalLogger, config, transports),
  };
}
