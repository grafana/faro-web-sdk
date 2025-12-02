import { Platform } from 'react-native';

import type { StackFrame } from '@grafana/faro-core';

/**
 * Parse React Native stack traces into structured stack frames
 *
 * React Native stack traces have different formats depending on platform and environment:
 *
 * iOS/Android (Dev):
 *   at functionName (file.js:123:45)
 *   at anonymous (native)
 *
 * iOS/Android (Release):
 *   functionName@123:456
 *   @[native code]
 *
 * Metro bundler:
 *   at Object.functionName (/path/to/file.js:123:456)
 */

const REACT_NATIVE_STACK_REGEX = /^\s*at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)$/;
const REACT_NATIVE_NATIVE_REGEX = /^\s*at\s+(.+?)\s+\(native\)$/;
const REACT_NATIVE_RELEASE_REGEX = /^(.+?)@(\d+):(\d+)$/;
const REACT_NATIVE_ANONYMOUS_REGEX = /^\s*at\s+anonymous\s+\((.+?):(\d+):(\d+)\)$/;
const METRO_BUNDLER_REGEX = /^\s*at\s+(?:Object\.)?(.+?)\s+\((.+?):(\d+):(\d+)\)$/;

export interface ParsedStackFrame {
  function?: string;
  filename?: string;
  lineno?: number;
  colno?: number;
  isNative?: boolean;
}

/**
 * Parse a single stack trace line into a structured frame
 */
export function parseStackTraceLine(line: string): ParsedStackFrame | null {
  if (!line || typeof line !== 'string') {
    return null;
  }

  const trimmedLine = line.trim();
  if (!trimmedLine) {
    return null;
  }

  // Try standard React Native format: at functionName (file.js:123:45)
  let match = trimmedLine.match(REACT_NATIVE_STACK_REGEX);
  if (match) {
    return {
      function: match[1] || '<anonymous>',
      filename: match[2],
      lineno: parseInt(match[3], 10),
      colno: parseInt(match[4], 10),
    };
  }

  // Try Metro bundler format: at Object.functionName (/path/to/file.js:123:456)
  match = trimmedLine.match(METRO_BUNDLER_REGEX);
  if (match) {
    return {
      function: match[1] || '<anonymous>',
      filename: match[2],
      lineno: parseInt(match[3], 10),
      colno: parseInt(match[4], 10),
    };
  }

  // Try anonymous format: at anonymous (file.js:123:45)
  match = trimmedLine.match(REACT_NATIVE_ANONYMOUS_REGEX);
  if (match) {
    return {
      function: '<anonymous>',
      filename: match[1],
      lineno: parseInt(match[2], 10),
      colno: parseInt(match[3], 10),
    };
  }

  // Try native format: at functionName (native)
  match = trimmedLine.match(REACT_NATIVE_NATIVE_REGEX);
  if (match) {
    return {
      function: match[1] || '<native>',
      filename: '<native>',
      isNative: true,
    };
  }

  // Try release/minified format: functionName@123:456
  match = trimmedLine.match(REACT_NATIVE_RELEASE_REGEX);
  if (match) {
    return {
      function: match[1] || '<anonymous>',
      filename: '<unknown>',
      lineno: parseInt(match[2], 10),
      colno: parseInt(match[3], 10),
    };
  }

  // Couldn't parse this line
  return null;
}

/**
 * Parse a full stack trace string into an array of structured frames
 */
export function parseStackTrace(stackTrace: string): ParsedStackFrame[] {
  if (!stackTrace || typeof stackTrace !== 'string') {
    return [];
  }

  const lines = stackTrace.split('\n');
  const frames: ParsedStackFrame[] = [];

  for (const line of lines) {
    const frame = parseStackTraceLine(line);
    if (frame) {
      frames.push(frame);
    }
  }

  return frames;
}

/**
 * Convert parsed stack frames to Faro's StackFrame format
 */
export function toFaroStackFrames(parsedFrames: ParsedStackFrame[]): StackFrame[] {
  return parsedFrames.map((frame, _index) => ({
    filename: frame.filename || '<unknown>',
    function: frame.function || '<anonymous>',
    lineno: frame.lineno,
    colno: frame.colno,
  }));
}

/**
 * Extract and parse stack frames from an Error object
 */
export function getStackFramesFromError(error: Error): StackFrame[] {
  if (!error || !error.stack) {
    return [];
  }

  try {
    const parsedFrames = parseStackTrace(error.stack);
    return toFaroStackFrames(parsedFrames);
  } catch (_e) {
    // If parsing fails, return empty array
    return [];
  }
}

/**
 * Get platform-specific error context
 */
export function getPlatformErrorContext(): Record<string, string> {
  return {
    platform: Platform.OS,
    platformVersion: Platform.Version.toString(),
    isHermes: !!(global as any).HermesInternal,
  };
}

/**
 * Enhance error with React Native specific information
 */
export function enhanceErrorWithContext(
  error: Error,
  additionalContext?: Record<string, string>
): {
  error: Error;
  stackFrames: StackFrame[];
  context: Record<string, string>;
} {
  const stackFrames = getStackFramesFromError(error);
  const platformContext = getPlatformErrorContext();

  return {
    error,
    stackFrames,
    context: {
      ...platformContext,
      ...additionalContext,
    },
  };
}
