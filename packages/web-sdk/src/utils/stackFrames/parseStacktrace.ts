import type { ExtendedError, Stacktrace } from '@grafana/faro-core';

import { getStackFramesFromError } from './getStackFramesFromError';
import type { StackframeParserOptions } from './types';

export function parseStacktrace(error: ExtendedError, options?: StackframeParserOptions): Stacktrace {
  return {
    frames: getStackFramesFromError(error, options),
  };
}
