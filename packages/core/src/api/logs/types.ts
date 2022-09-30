import type { BaseObject, LogLevel } from '../../utils';
import type { TraceContext } from '../traces';

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
  skipDedupe?: boolean;
}

export interface LogsAPI {
  pushLog: (args: unknown[], options?: PushLogOptions) => void;
}
