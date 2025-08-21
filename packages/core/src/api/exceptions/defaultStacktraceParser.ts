import type { ExtendedError, Stacktrace, ExceptionStackFrame } from './types';

/**
 * Simple default stacktrace parser for the core package.
 * Web SDK provides a more sophisticated parser.
 */
export function defaultStacktraceParser(error: ExtendedError): Stacktrace {
  const frames: ExceptionStackFrame[] = [];
  const stack = error.stack ?? error.stacktrace;

  if (stack) {
    // Simple line-by-line parsing
    const lines = stack.split('\n');
    for (const line of lines) {
      if (line.trim()) {
        frames.push({
          filename: 'unknown',
          function: line.trim(),
        });
      }
    }
  }

  return { frames };
}