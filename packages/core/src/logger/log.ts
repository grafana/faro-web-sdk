import type { BaseObject } from '../utils/baseObject';
import { getCurrentTimestamp } from '../utils/getCurrentTimestamp';
import { pushLog } from './buffer';

export interface LogEvent {
  context: LogContext;
  level: LogLevels;
  message: string;
  timestamp: string;
}

export enum LogLevels {
  TRACE = 'trace',
  DEBUG = 'debug',
  INFO = 'info',
  LOG = 'log',
  WARN = 'warn',
  ERROR = 'error',
}

export type LogContext = BaseObject;

export function log(args: unknown[], level = LogLevels.LOG, context: LogContext = {}): void {
  pushLog({
    message: args
      .map((arg) => {
        try {
          return String(arg);
        } catch (err) {
          return '';
        }
      })
      .join(' '),
    level,
    context,
    timestamp: getCurrentTimestamp(),
  });
}
