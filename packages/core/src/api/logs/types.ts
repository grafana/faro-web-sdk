import type { SpanContext } from '@opentelemetry/api';

import type { LogLevel } from '../../utils';
import type { TraceContext } from '../traces';
import type { UserAction } from '../types';

export type LogContext = Record<string, string>;

export interface LogEvent {
  context: LogContext | undefined;
  level: LogLevel;
  message: string;
  timestamp: string;

  trace?: TraceContext;
  action?: UserAction;
}

export interface PushLogOptions {
  context?: LogContext;
  level?: LogLevel;
  skipDedupe?: boolean;
  spanContext?: Pick<SpanContext, 'traceId' | 'spanId'>;
  timestampOverwriteMs?: number;
}

export interface LogsAPI {
  pushLog: (args: unknown[], options?: PushLogOptions) => void;
}

export type LogArgsSerializer = (args: unknown[]) => string;
