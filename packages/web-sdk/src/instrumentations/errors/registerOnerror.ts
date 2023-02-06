import { isString } from '@grafana/faro-core';
import type { API, ExceptionStackFrame } from '@grafana/faro-core';

import { unknownString } from './const';
import { getErrorDetails } from './getErrorDetails';
import { getValueAndTypeFromMessage } from './getValueAndTypeFromMessage';
import { buildStackFrame } from './stackFrames';

export function registerOnerror(api: API): void {
  const oldOnerror = window.onerror;

  window.onerror = (...args) => {
    try {
      const [evt, source, lineno, colno, error] = args;
      let value: string | undefined;
      let type: string | undefined;
      let stackFrames: ExceptionStackFrame[] = [];
      const eventIsString = isString(evt);
      const initialStackFrame = buildStackFrame(source, unknownString, lineno, colno);

      if (error || !eventIsString) {
        [value, type, stackFrames] = getErrorDetails((error ?? evt) as Error | Event);

        if (stackFrames.length === 0) {
          stackFrames = [initialStackFrame];
        }
      } else if (eventIsString) {
        [value, type] = getValueAndTypeFromMessage(evt);
        stackFrames = [initialStackFrame];
      }

      if (value) {
        api.pushError(new Error(value), { type, stackFrames });
      }
    } finally {
      oldOnerror?.apply(window, args);
    }
  };
}
