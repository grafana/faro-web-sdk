import type { SpanContext } from '@opentelemetry/api';

import type { TraceContext } from '../traces';

export type StacktraceParser = (err: ExtendedError) => Stacktrace;

export interface ExceptionStackFrame {
  filename: string;
  function: string;

  colno?: number;
  lineno?: number;

  bundleid?: string;
}

export interface ExtendedError extends Error {
  columnNumber?: number;
  stacktrace?: Error['stack'];
}

export interface Stacktrace {
  frames: ExceptionStackFrame[];
}

export type ExceptionContext = Record<string, string>;

export interface ExceptionEvent {
  timestamp: string;
  type: string;
  value: string;

  stacktrace?: Stacktrace;
  trace?: TraceContext;
  context?: ExceptionContext;
}

export interface PushErrorOptions {
  skipDedupe?: boolean;
  stackFrames?: ExceptionStackFrame[];
  type?: string;
  context?: ExceptionContext;
  spanContext?: Pick<SpanContext, 'traceId' | 'spanId'>;
}

export interface ExceptionsAPI {
  changeStacktraceParser: (stacktraceParser: StacktraceParser) => void;
  getStacktraceParser: () => StacktraceParser | undefined;
  pushError: (value: Error, options?: PushErrorOptions) => void;
}
