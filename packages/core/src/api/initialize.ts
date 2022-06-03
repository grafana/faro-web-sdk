import type { Config } from '../config';
import type { Metas } from '../metas';
import type { Transports } from '../transports';
import { initializeExceptions } from './exceptions';
import { initializeLogs } from './logs';
import { initializeMeasurements } from './measurements';
import { initializeMeta } from './meta/initialize';
import { initializeTraces } from './traces';
import type { API } from './types';

export function initializeAPI(config: Config, transports: Transports, metas: Metas): API {
  const tracesApi = initializeTraces(transports, metas);

  return {
    ...tracesApi,
    ...initializeExceptions(config, transports, metas, tracesApi),
    ...initializeMeta(transports, metas),
    ...initializeLogs(transports, metas, tracesApi),
    ...initializeMeasurements(transports, metas, tracesApi),
  };
}
