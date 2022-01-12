import type { Meta } from '../meta';
import type { Transports } from '../transports';
import type { Commander } from './commander';
import { initializeExceptions } from './exceptions';
import { initializeLogging } from './logging';
import { initializeMeasurements } from './measurements';
import { initializeTracing } from './tracing';

export function initialize(transports: Transports, meta: Meta): Commander {
  return {
    ...initializeExceptions(transports, meta),
    ...initializeLogging(transports, meta),
    ...initializeMeasurements(transports, meta),
    ...initializeTracing(transports, meta),
  };
}
