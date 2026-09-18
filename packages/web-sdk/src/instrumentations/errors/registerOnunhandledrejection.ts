import { globalObject, isPrimitive } from '@grafana/faro-core';
import type { API, ExceptionStackFrame } from '@grafana/faro-core';

import { primitiveUnhandledType, primitiveUnhandledValue } from './const';
import { getErrorDetails } from './getErrorDetails';
import type { ExtendedPromiseRejectionEvent } from './types';

// Store handlers for cleanup in tests
const registeredHandlers = new Set<() => void>();

export function registerOnunhandledrejection(api: API): () => void {
  const handler = (evt: ExtendedPromiseRejectionEvent) => {
    let error = evt;

    if (Reflect.has(evt, 'reason')) {
      error = evt.reason;
    } else if (evt.detail && 'reason' in evt.detail) {
      error = evt.detail?.reason;
    }

    let value: string | undefined;
    let type: string | undefined;
    let stackFrames: ExceptionStackFrame[] = [];
    if (error == null || isPrimitive(error)) {
      value = `${primitiveUnhandledValue} ${String(error)}`;
      type = primitiveUnhandledType;
    } else {
      [value, type, stackFrames] = getErrorDetails(error);
    }

    if (value) {
      api.pushError(new Error(value), { type, stackFrames });
    }
  };

  globalObject.addEventListener('unhandledrejection', handler);
  const cleanup = () => {
    globalObject.removeEventListener('unhandledrejection', handler);
    registeredHandlers.delete(cleanup);
  };
  registeredHandlers.add(cleanup);
  return cleanup;
}

// Test-only utility to reset state between tests
export function __resetOnunhandledrejectionForTests(): void {
  registeredHandlers.forEach((cleanup) => cleanup());
}
