import { isString } from '@grafana/frontend-agent-core';
import type { Agent, StackFrame } from '@grafana/frontend-agent-core';

import { unknownString } from './const';
import { getErrorDetails } from './getErrorDetails';
import { getValueAndTypeFromMessage } from './getValueAndTypeFromMessage';
import { buildStackFrame } from './stackFrames';

export function registerOnerror(agent: Agent): void {
  window.onerror = (event, source, lineno, colno, error) => {
    let value: string | undefined;
    let type: string | undefined;
    let stackFrames: StackFrame[] = [];
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
      agent.commander.pushException(value, type, stackFrames);
    }
  };
}
