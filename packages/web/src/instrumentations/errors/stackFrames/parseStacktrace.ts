import type { ExtendedError, Stacktrace } from '@grafana/faro-core';

import { getStackFramesFromError } from './getStackFramesFromError';

export function parseStacktrace(error: ExtendedError): Stacktrace {
  return {
    frames: getStackFramesFromError(error),
  };
}
