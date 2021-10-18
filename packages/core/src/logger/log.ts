import { pushEvent, QueueItemType } from '../queue';
import type { BaseObject } from '../utils/baseObject';
import { getCurrentTimestamp } from '../utils/getCurrentTimestamp';

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

export function pushLog(args: unknown[], level = LogLevels.LOG, context: LogContext = {}): void {
  try {
    pushEvent(QueueItemType.LOGS, {
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
  } catch (err) {}
}
