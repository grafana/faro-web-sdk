import type { Meta } from '../meta';
import type { Transports } from '../transports';
import { initializeExceptions } from './exceptions';
import { initializeLogs } from './logs';
import { initializeMeasurements } from './measurements';
import { initializeTraces } from './traces';
import type { API } from './types';

export function initializeAPI(transports: Transports, meta: Meta): API {
  return {
    ...initializeExceptions(transports, meta),
    ...initializeLogs(transports, meta),
    ...initializeMeasurements(transports, meta),
    ...initializeTraces(transports, meta),
  };
}
