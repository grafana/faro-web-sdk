import { ExceptionStackFrame, isPrimitive } from '@grafana/faro-core';
import type { API } from '@grafana/faro-core';

import { primitiveUnhandledType, primitiveUnhandledValue } from './const';
import { getErrorDetails } from './getErrorDetails';
import type { ExtendedPromiseRejectionEvent } from './types';

export function registerOnunhandledrejection(api: API): void {
  window.addEventListener('unhandledrejection', (evt: ExtendedPromiseRejectionEvent) => {
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
      [value, type, stackFrames] = getErrorDetails(error);
    }

    if (value) {
      api.pushError(new Error(value), { type, stackFrames });
    }
  });
}
