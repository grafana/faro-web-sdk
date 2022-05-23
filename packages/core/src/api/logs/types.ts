import type { BaseObject } from '../../utils';
import type { TraceContext } from '../traces/types';

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

  trace?: TraceContext;
}

export interface PushLogOptions {
  context?: LogContext;
  level?: LogLevel;
}

export interface LogsAPI {
  callOriginalConsoleMethod: (level: LogLevel, ...args: unknown[]) => void;
  pushLog: (args: unknown[], options?: PushLogOptions) => void;
}
