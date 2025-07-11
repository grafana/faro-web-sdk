import type { API, Config, PushErrorOptions } from '@grafana/faro-core';

import { getDetailsFromErrorArgs } from './getErrorDetails';

export function registerOnerror(api: API, config: Config): void {
  const oldOnerror = window.onerror;

  window.onerror = (...args) => {
    try {
      const { value, type, stackFrames } = getDetailsFromErrorArgs(args, config.parseStacktrace);
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
