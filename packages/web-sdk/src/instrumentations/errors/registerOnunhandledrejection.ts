import { isPrimitive } from '@grafana/faro-core';
import type { API, ExceptionStackFrame } from '@grafana/faro-core';

import { primitiveUnhandledType, primitiveUnhandledValue } from './const';
import { getErrorDetails } from './getErrorDetails';
import type { ExtendedPromiseRejectionEvent } from './types';

// Store handlers for cleanup in tests
const registeredHandlers: Array<(evt: ExtendedPromiseRejectionEvent) => void> = [];

export function registerOnunhandledrejection(api: API): void {
  const handler = (evt: ExtendedPromiseRejectionEvent) => {
    let error = evt;

    if (error.reason) {
      error = evt.reason;
    } else if (evt.detail?.reason) {
      error = evt.detail?.reason;
    }

    let value: string | undefined;
    let type: string | undefined;
    let stackFrames: ExceptionStackFrame[] = [];
    if (isPrimitive(error)) {
      value = `${primitiveUnhandledValue} ${String(error)}`;
      type = primitiveUnhandledType;
    } else {
      [value, type, stackFrames] = getErrorDetails(error, api.parseStacktrace);
    }

    if (value) {
      api.pushError(new Error(value), { type, stackFrames });
    }
  };

  window.addEventListener('unhandledrejection', handler);
  registeredHandlers.push(handler);
}

// Test-only utility to reset state between tests
export function __resetOnunhandledrejectionForTests(): void {
  registeredHandlers.forEach((handler) => {
    window.removeEventListener('unhandledrejection', handler);
  });
  registeredHandlers.length = 0;
}
