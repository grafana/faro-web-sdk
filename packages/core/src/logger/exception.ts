import { getCurrentTimestamp } from '../utils/getCurrentTimestamp';
import { LoggerBufferItemType, pushEvent } from './buffer';
import { getStackFramesFromError } from './stackFrames';
import type { StackFrame } from './stackFrames';

export interface ExceptionEvent {
  stacktrace: {
    frames: StackFrame[];
  };
  timestamp: string;
  type: 'Error';
  value: string;
}

export function pushExceptionFromError(error: Error): void {
  try {
    pushEvent(LoggerBufferItemType.EXCEPTIONS, {
      type: 'Error',
      value: error.message,
      stacktrace: {
        frames: getStackFramesFromError(error),
      },
      timestamp: getCurrentTimestamp(),
    });
  } catch (err) {}
}

export function pushExceptionFromSource(
  event: string | Event,
  filename: string,
  lineno: number | null,
  colno: number | null
): void {
  try {
    const stackFrame: StackFrame = {
      filename,
      function: '?',
    };

    if (lineno !== null) {
      stackFrame.lineno = lineno;
    }

    if (colno !== null) {
      stackFrame.colno = colno;
    }

    pushEvent(LoggerBufferItemType.EXCEPTIONS, {
      type: 'Error',
      value: String(event),
      stacktrace: {
        frames: [stackFrame],
      },
      timestamp: getCurrentTimestamp(),
    });
  } catch (err) {}
}
