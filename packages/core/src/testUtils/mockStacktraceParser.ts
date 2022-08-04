import type { ExceptionStackFrame, StacktraceParser } from '../api';

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
