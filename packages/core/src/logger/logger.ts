import type { Meta } from '../meta';
import type { Transports } from '../transports';
import { initializeException } from './exception';
import type { Exception } from './exception';
import { initializeLog } from './log';
import type { Log } from './log';
import { initializeTraces } from './trace';
import type { Traces } from './trace';

export type Logger = Log & Exception & Traces;

export function initializeLogger(transports: Transports, meta: Meta): Logger {
  return {
    ...initializeException(transports, meta),
    ...initializeLog(transports, meta),
    ...initializeTraces(transports, meta),
  };
}
