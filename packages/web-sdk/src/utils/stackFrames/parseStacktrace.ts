import type { ExtendedError, Stacktrace, StacktraceParser } from '@grafana/faro-core';

import { getStackFramesFromError } from './getStackFramesFromError';
import type { StackframeParserOptions } from './types';


export function parseStacktrace(error: ExtendedError): Stacktrace {
  return {
    frames: getStackFramesFromError(error),
  };
}

export function newStackTraceParser(options?: StackframeParserOptions): StacktraceParser {
  return (error: ExtendedError) => {
    return {
      frames: getStackFramesFromError(error, options),
    };
  };
}
