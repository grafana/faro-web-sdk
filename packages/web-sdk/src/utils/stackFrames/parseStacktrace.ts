import type { ExtendedError, Stacktrace } from '@grafana/faro-core';

import { getStackFramesFromError } from './getStackFramesFromError';
import type { StackframeParserOptions } from './types';

export function createStacktraceParser(options?: StackframeParserOptions): (error: ExtendedError) => Stacktrace {
  return (error: ExtendedError) => ({
    frames: getStackFramesFromError(error, options),
  });
}

export function parseStacktrace(error: ExtendedError, options?: StackframeParserOptions): Stacktrace {
  return {
    frames: getStackFramesFromError(error, options),
  };
}
