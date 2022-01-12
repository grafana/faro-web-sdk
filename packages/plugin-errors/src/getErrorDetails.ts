import { isDomError, isDomException, isError, isErrorEvent, isEvent, isObject } from '@grafana/frontend-agent-core';
import type { StackFrame } from '@grafana/frontend-agent-core';

import { domErrorType, domExceptionType, objectEventValue } from './const';
import { getStackFramesFromError } from './stackFrames';

type ErrorEvent = (Error | Event) & {
  error?: Error;
};

export function getErrorDetails(event: ErrorEvent): [string | undefined, string | undefined, StackFrame[]] {
  let value: string | undefined;
  let type: string | undefined;
  let stackFrames: StackFrame[] = [];
  let isDomErrorRes: boolean | undefined;
  let isEventRes: boolean | undefined;

  if (isErrorEvent(event) && event.error) {
    value = event.error.message;
    type = event.error.name;
    stackFrames = getStackFramesFromError(event.error);
  } else if ((isDomErrorRes = isDomError(event)) || isDomException(event)) {
    const { name, message } = event;

    type = name ?? (isDomErrorRes ? domErrorType : domExceptionType);
    value = message ? `${type}: ${message}` : type;
  } else if (isError(event)) {
    value = event.message;
    stackFrames = getStackFramesFromError(event);
  } else if (isObject(event) || (isEventRes = isEvent(event))) {
    type = isEventRes ? event.constructor.name : undefined;
    value = `${objectEventValue} ${Object.keys(event)}`;
  }

  return [value, type, stackFrames];
}
