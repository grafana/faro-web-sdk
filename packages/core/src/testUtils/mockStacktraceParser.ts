import type { ExceptionStackFrame } from '../api';
import type { StacktraceParser } from '../config';

export const mockStacktraceParser: StacktraceParser = (err) => {
  const frames: ExceptionStackFrame[] = [];
  const stack = err.stack ?? err.stacktrace;

  if (stack) {
    stack.split('\n').forEach((line) => {
      frames.push({
        filename: line,
        function: '',
      });
    });
  }

  return {
    frames,
  };
};
