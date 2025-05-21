import type { API, PushErrorOptions } from '@grafana/faro-core';

import { getDetailsFromErrorArgs } from './getErrorDetails';

export function registerOnerror(api: API): void {
  const oldOnerror = window.onerror;

  window.onerror = (...args) => {
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
      oldOnerror?.apply(window, args);
    }
  };
}
