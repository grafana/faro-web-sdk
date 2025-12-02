import { isError, isObject, isString } from '@grafana/faro-core';
import type { ExceptionStackFrame, LogArgsSerializer } from '@grafana/faro-core';

/**
 * Error details extracted from console.error arguments
 */
export interface ErrorDetails {
  value?: string;
  type?: string;
  stackFrames?: ExceptionStackFrame[];
}

/**
 * React Native-specific log args serializer that handles objects better
 * Converts objects to JSON strings instead of [object Object]
 */
export const reactNativeLogArgsSerializer: LogArgsSerializer = (args) =>
  args
    .map((arg) => {
      try {
        // Handle null and undefined
        if (arg === null) return 'null';
        if (arg === undefined) return 'undefined';

        // Handle Error objects
        if (isError(arg)) {
          return `${arg.name}: ${arg.message}`;
        }

        // Handle objects and arrays - stringify them
        if (isObject(arg) || Array.isArray(arg)) {
          try {
            return JSON.stringify(arg);
          } catch {
            return String(arg);
          }
        }

        // Handle primitives
        return String(arg);
      } catch (_err) {
        return '';
      }
    })
    .join(' ');

/**
 * Gets stack frames from an Error object
 * React Native errors have a `stack` property as a string
 */
function getStackFramesFromError(error: Error): ExceptionStackFrame[] {
  if (!error.stack) {
    return [];
  }

  // Parse React Native stack trace format
  // Example format:
  // "Error: message\n    at functionName (file.js:10:5)\n    at anotherFunction (file.js:20:10)"

  const stackFrames: ExceptionStackFrame[] = [];
  const lines = error.stack.split('\n').slice(1); // Skip first line (error message)

  for (const line of lines) {
    // Match patterns like:
    // "    at functionName (file.js:10:5)"
    // "    at file.js:10:5"
    const match = line.match(/^\s*at\s+(?:(.+?)\s+\()?(.+?):(\d+):(\d+)\)?$/);

    if (match) {
      const [, functionName, filename, lineNo, colNo] = match;

      stackFrames.push({
        filename: filename?.trim() || '<anonymous>',
        function: functionName?.trim() || '<anonymous>',
        lineno: lineNo ? parseInt(lineNo, 10) : undefined,
        colno: colNo ? parseInt(colNo, 10) : undefined,
      });
    }
  }

  return stackFrames;
}

/**
 * Extracts error details from Error object
 */
function getErrorDetails(error: Error): [string | undefined, string | undefined, ExceptionStackFrame[]] {
  let value: string | undefined;
  let type: string | undefined;
  let stackFrames: ExceptionStackFrame[] = [];

  if (isError(error)) {
    value = error.message;
    type = error.name;
    stackFrames = getStackFramesFromError(error);
  } else if (isObject(error)) {
    // Handle error-like objects
    value = String(error);
    type = error.constructor?.name;
  }

  return [value, type, stackFrames];
}

/**
 * Extracts error details from an array of arguments
 * Similar to web SDK's getDetailsFromErrorArgs but adapted for React Native
 */
export function getDetailsFromErrorArgs(args: [any?, ...any[]]): ErrorDetails {
  const [firstArg] = args;

  let value: string | undefined;
  let type: string | undefined;
  let stackFrames: ExceptionStackFrame[] = [];

  if (isError(firstArg)) {
    [value, type, stackFrames] = getErrorDetails(firstArg);
  } else if (isString(firstArg)) {
    value = firstArg;
  } else if (isObject(firstArg)) {
    try {
      value = JSON.stringify(firstArg);
    } catch {
      value = String(firstArg);
    }
  }

  return { value, type, stackFrames };
}

/**
 * Gets error details from console.error arguments
 * If first argument is an Error, extracts error details with stack frames
 * Otherwise, uses the provided serializer to stringify the arguments
 */
export function getDetailsFromConsoleErrorArgs(args: [any?, ...any[]], serializer: LogArgsSerializer): ErrorDetails {
  if (isError(args[0])) {
    return getDetailsFromErrorArgs(args);
  } else {
    return { value: serializer(args) };
  }
}
