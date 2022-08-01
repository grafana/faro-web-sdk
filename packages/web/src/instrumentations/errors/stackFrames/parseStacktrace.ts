import type { ExtendedError, Stacktrace } from '@grafana/agent-core';

import { getStackFramesFromError } from './getStackFramesFromError';

export function parseStacktrace(error: ExtendedError): Stacktrace {
  return {
    frames: getStackFramesFromError(error),
  };
}
