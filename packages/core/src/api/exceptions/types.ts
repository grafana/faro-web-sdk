import type { TraceContext } from '../traces';

export interface ExceptionStackFrame {
  filename: string;
  function: string;

  colno?: number;
  lineno?: number;
}

export interface ExtendedError extends Error {
  columnNumber?: number;
  framesToPop?: number;
  stacktrace?: Error['stack'];
}

export interface Stacktrace {
  frames: ExceptionStackFrame[];
}

export interface ExceptionEvent {
  timestamp: string;
  type: string;
  value: string;

  stacktrace?: Stacktrace;
  trace?: TraceContext;
}

export interface PushErrorOptions {
  stackFrames?: ExceptionStackFrame[];
  type?: string;
}

export interface ExceptionsAPI {
  pushError: (value: Error, options?: PushErrorOptions) => void;
}
