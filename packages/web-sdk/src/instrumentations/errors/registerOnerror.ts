import type { API } from '@grafana/faro-core';

import { getDetailsFromErrorArgs } from '../../utils';

export function registerOnerror(api: API): void {
  const oldOnerror = window.onerror;

  window.onerror = (...args) => {
    try {
      const { value, type, stackFrames } = getDetailsFromErrorArgs(args);

      if (value) {
        api.pushError(new Error(value), { type, stackFrames });
      }
    } finally {
      oldOnerror?.apply(window, args);
    }
  };
}
