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
  trace?: {
    trace_id: string;
    span_id: string;
  };
}

export interface PushExceptionOptions {
  stackFrames?: ExceptionStackFrame[];
  type?: string;
}

export interface ExceptionsAPI {
  pushException: (value: string, options?: PushExceptionOptions) => void;
}
