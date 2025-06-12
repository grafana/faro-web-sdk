import type { ExtendedError, Stacktrace, StacktraceParser } from '@grafana/faro-core';

import type { StackframeParserOptions } from './types';

import { getStackFramesFromError } from './getStackFramesFromError';


export function parseStacktrace(error: ExtendedError): Stacktrace {
  return {
    frames: getStackFramesFromError(error),
  };
}

export function newStackTraceParser(options?: StackframeParserOptions): StacktraceParser {
  return (error: ExtendedError)=>{
    return {
      frames: getStackFramesFromError(error, options),
    }
  }
}
