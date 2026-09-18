import { globalObject } from '@grafana/faro-core';
import type { API, PushErrorOptions } from '@grafana/faro-core';

import { getDetailsFromErrorArgs } from './getErrorDetails';

const browserHandlers = new Map<NonNullable<OnErrorEventHandler>, { previous: OnErrorEventHandler }>();

export function registerOnerror(api: API): () => void {
  if (typeof window === 'undefined') {
    const handler = (event: ErrorEvent) => {
      const args = [event.message, event.filename, event.lineno, event.colno, event.error];
      let details = getDetailsFromErrorArgs(args);
      if (!details.value && event.message) {
        // A worker can throw a primitive; retain its ErrorEvent message and location.
        details = getDetailsFromErrorArgs(args.slice(0, 4));
      }
      const { value, type, stackFrames } = details;
      if (value) {
        api.pushError(new Error(value), { type, stackFrames, originalError: event.error });
      }
    };
    globalObject.addEventListener('error', handler);
    return () => globalObject.removeEventListener('error', handler);
  }

  const registration = { previous: window.onerror };
  let active = true;

  const handler: NonNullable<OnErrorEventHandler> = (...args) => {
    try {
      if (!active) {
        return;
      }
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
      registration.previous?.apply(window, args);
    }
  };
  browserHandlers.set(handler, registration);
  window.onerror = handler;

  return () => {
    active = false;
    // Another Faro instance may have wrapped this handler after initialization.
    for (const other of browserHandlers.values()) {
      if (other.previous === handler) {
        other.previous = registration.previous;
      }
    }
    if (window.onerror === handler) {
      window.onerror = registration.previous;
    }
    browserHandlers.delete(handler);
  };
}
