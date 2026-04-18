import type { ExceptionStackFrame, ExtendedError, Stacktrace } from '../api';

export const mockStacktraceParser = (err: ExtendedError): Stacktrace => {
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
