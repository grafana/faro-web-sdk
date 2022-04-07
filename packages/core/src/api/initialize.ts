import type { Metas } from '../metas';
import type { Transports } from '../transports';
import { initializeExceptions } from './exceptions';
import { initializeLogs } from './logs';
import { initializeMeasurements } from './measurements';
import { initializeMeta } from './meta/initialize';
import { initializeTraces } from './traces';
import type { API } from './types';

export function initializeAPI(transports: Transports, metas: Metas): API {
  return {
    ...initializeExceptions(transports, metas),
    ...initializeLogs(transports, metas),
    ...initializeMeasurements(transports, metas),
    ...initializeTraces(transports, metas),
    ...initializeMeta(transports, metas),
  };
}
