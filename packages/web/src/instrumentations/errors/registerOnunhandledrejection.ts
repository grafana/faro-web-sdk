import { Faro, isPrimitive } from '@grafana/faro-core';

import { primitiveUnhandledType, primitiveUnhandledValue } from './const';
import { getErrorDetails } from './getErrorDetails';
import type { ExtendedPromiseRejectionEvent } from './types';

export function registerOnunhandledrejection(faro: Faro): void {
  window.addEventListener('unhandledrejection', (evt: ExtendedPromiseRejectionEvent) => {
    let error = evt;

    if (error.reason) {
      error = evt.reason;
    } else if (evt.detail?.reason) {
      error = evt.detail?.reason;
    }

    let value: string | undefined;
    let type: string | undefined;

    if (isPrimitive(error)) {
      value = `${primitiveUnhandledValue} ${String(error)}`;
      type = primitiveUnhandledType;
    } else {
      [value, type] = getErrorDetails(error);
    }

    if (value) {
      faro.api.pushError(new Error(value), { type });
    }
  });
}
