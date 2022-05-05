import { Agent, isString } from '@grafana/agent-core';
import type { ExceptionStackFrame } from '@grafana/agent-core';

import { unknownString } from './const';
import { getErrorDetails } from './getErrorDetails';
import { getValueAndTypeFromMessage } from './getValueAndTypeFromMessage';
import { buildStackFrame } from './stackFrames';

export function registerOnerror(agent: Agent): void {
  // The error event is a little bit different than other events when it comes to the listener
  // window.addEventListener does not provide all parameters, hence we need to use the window.onerror syntax
  // To be investigated: https://developer.mozilla.org/en-US/docs/Web/API/GlobalEventHandlers/onerror

  window.onerror = (event, source, lineno, colno, error) => {
    let value: string | undefined;
    let type: string | undefined;
    let stackFrames: ExceptionStackFrame[] = [];
    const eventIsString = isString(event);
    const initialStackFrame = buildStackFrame(source, unknownString, lineno, colno);

    if (error || !eventIsString) {
      [value, type, stackFrames] = getErrorDetails((error ?? event) as Error | Event);

      if (stackFrames.length === 0) {
        stackFrames = [initialStackFrame];
      }
    } else if (eventIsString) {
      [value, type] = getValueAndTypeFromMessage(event);
      stackFrames = [initialStackFrame];
    }

    if (value) {
      agent.api.pushException(value, type, stackFrames);
    }
  };
}
