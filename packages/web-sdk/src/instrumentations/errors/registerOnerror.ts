import { globalObject } from '@grafana/faro-core';
import type { API, PushErrorOptions } from '@grafana/faro-core';

import { getDetailsFromErrorArgs } from './getErrorDetails';

export function registerOnerror(api: API): void {
  const target = typeof window !== 'undefined' ? window : globalObject;
  const oldOnerror = target.onerror;

  target.onerror = (...args) => {
    try {
      let { value, type, stackFrames } = getDetailsFromErrorArgs(args);
      if (typeof window === 'undefined' && !value) {
        // Retain the event message/location when a worker throws a primitive.
        ({ value, type, stackFrames } = getDetailsFromErrorArgs(args.slice(0, 4)));
      }
      const originalError = args[4];

      if (value) {
        const options: PushErrorOptions = { type, stackFrames };

        if (originalError != null) {
          options.originalError = originalError;
        }

        api.pushError(new Error(value), options);
      }
    } finally {
      oldOnerror?.apply(target, args);
    }
  };
}
