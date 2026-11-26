import type { API, PushErrorOptions } from '@grafana/faro-core';

import { getDetailsFromErrorArgs } from './getErrorDetails';

export function registerOnerror(api: API): void {
  const oldOnerror = window.onerror;

  window.onerror = (...args) => {
    let previousResult: unknown;

    try {
      const { value, type, stackFrames } = getDetailsFromErrorArgs(args);
      const originalError = args[4];

      if (value) {
        const options: PushErrorOptions = { type, stackFrames };

        if (originalError != null) {
          options.originalError = originalError;
        }

        api.pushError(new Error(value), options);
      }
    } finally {
      previousResult = oldOnerror?.apply(window, args);
    }

    return previousResult;
  };
}
