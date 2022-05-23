import type { TraceContext } from '../traces/types';

export interface ExceptionStackFrame {
  filename: string;
  function: string;

  colno?: number;
  lineno?: number;
}

export interface ExceptionEvent {
  timestamp: string;
  type: string;
  value: string;

  stacktrace?: {
    frames: ExceptionStackFrame[];
  };
  trace?: TraceContext;
}

export interface PushExceptionOptions {
  stackFrames?: ExceptionStackFrame[];
  type?: string;
}

export interface ExceptionsAPI {
  pushException: (value: string, options?: PushExceptionOptions) => void;
}
