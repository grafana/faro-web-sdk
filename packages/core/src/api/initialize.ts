import type { Config } from '../config';
import type { Metas } from '../metas';
import type { Transports } from '../transports';
import { initializeExceptionsAPI } from './exceptions';
import { initializeLogsAPI } from './logs';
import { initializeMeasurementsAPI } from './measurements';
import { initializeMetaAPI } from './meta/initialize';
import { initializeTracesAPI } from './traces';
import type { API } from './types';

export function initializeAPI(config: Config, transports: Transports, metas: Metas): API {
  const tracesApi = initializeTracesAPI(transports, metas);

  return {
    ...tracesApi,
    ...initializeExceptionsAPI(config, transports, metas, tracesApi),
    ...initializeMetaAPI(transports, metas),
    ...initializeLogsAPI(transports, metas, tracesApi),
    ...initializeMeasurementsAPI(transports, metas, tracesApi),
  };
}
