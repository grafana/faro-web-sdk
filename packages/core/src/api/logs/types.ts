import type { BaseObject } from '../../utils';
import type { Span } from '../traces';

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

  trace?: {
    trace_id: string;
    span_id: string;
  };
}

export interface PushLogOptions {
  context?: LogContext;
  level?: LogLevel;
  span?: Span;
}

export interface LogsAPI {
  callOriginalConsoleMethod: (level: LogLevel, ...args: unknown[]) => void;
  pushLog: (args: unknown[], options?: PushLogOptions) => void;
}
