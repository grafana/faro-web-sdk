import { getCurrentTimestamp } from '../utils/getCurrentTimestamp';
import { pushException } from './buffer';
import { getStackFrames } from './stackFrames';
import type { StackFrame } from './stackFrames';

export interface ExceptionEvent {
  stacktrace: {
    frames: StackFrame[];
  };
  timestamp: string;
  type: 'Error';
  value: string;
}

export function exception(error: Error): void {
  try {
    pushException({
      type: 'Error',
      value: error.message,
      stacktrace: {
        frames: getStackFrames(error),
      },
      timestamp: getCurrentTimestamp(),
    });
  } catch (err) {}
}
