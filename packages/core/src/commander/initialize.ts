import type { Meta } from '../meta/types';
import type { Transports } from '../transports';
import { initializeExceptions } from './exceptions';
import { initializeLogs } from './logs';
import { initializeMeasurements } from './measurements';
import { initializeTraces } from './traces';
import type { Commander } from './types';

export function initializeCommander(transports: Transports, meta: Meta): Commander {
  return {
    ...initializeExceptions(transports, meta),
    ...initializeLogs(transports, meta),
    ...initializeMeasurements(transports, meta),
    ...initializeTraces(transports, meta),
  };
}
