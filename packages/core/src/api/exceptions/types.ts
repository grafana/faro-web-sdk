import type { BaseObject } from '../../utils';
import type { TraceContext } from '../traces';

export type StacktraceParser = (err: ExtendedError) => Stacktrace;

export interface ExceptionStackFrame {
  filename: string;
  function: string;

  colno?: number;
  lineno?: number;
}

export interface ExtendedError extends Error {
  columnNumber?: number;
  stacktrace?: Error['stack'];
}

export interface Stacktrace {
  frames: ExceptionStackFrame[];
}

export type ExceptionContext = BaseObject;

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
}

export interface ExceptionsAPI {
  changeStacktraceParser: (stacktraceParser: StacktraceParser) => void;
  getStacktraceParser: () => StacktraceParser | undefined;
  pushError: (value: Error, options?: PushErrorOptions) => void;
}
