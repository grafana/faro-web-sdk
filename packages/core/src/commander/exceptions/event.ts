import type { StackFrame } from './stackFrame';

export interface Event {
  timestamp: string;
  type: string;
  value: string;

  stacktrace?: {
    frames: StackFrame[];
  };
}
