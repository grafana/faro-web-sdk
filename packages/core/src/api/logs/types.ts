import type { BaseObject } from '../../utils';

export enum LogLevel {
  TRACE = 'trace',
  DEBUG = 'debug',
  INFO = 'info',
  LOG = 'log',
  WARN = 'warn',
  ERROR = 'error',
}

export type LogContext = BaseObject;

export interface LogEvent {
  context: LogContext;
  level: LogLevel;
  message: string;
  timestamp: string;
}

export interface LogsAPI {
  pushLog: (args: unknown[], level?: LogLevel, context?: LogContext) => void;
}
