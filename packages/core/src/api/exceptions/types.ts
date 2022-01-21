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
}

export interface ExceptionsAPI {
  pushException: (value: string, type?: string, stackFrames?: ExceptionStackFrame[]) => void;
}
