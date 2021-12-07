import type { Meta } from '../meta';
import type { Transports } from '../transports';
import { initializeLoggerException } from './exception';
import type { LoggerException } from './exception';
import { initializeLoggerLog } from './log';
import type { LoggerLog } from './log';
import { initializeLoggerTrace } from './trace';
import type { LoggerTrace } from './trace';

export type Logger = LoggerLog & LoggerException & LoggerTrace;

export function initializeLogger(transports: Transports, meta: Meta): Logger {
  return {
    ...initializeLoggerException(transports, meta),
    ...initializeLoggerLog(transports, meta),
    ...initializeLoggerTrace(transports, meta),
  };
}
