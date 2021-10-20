import { isDomError, isDomException, isError, isErrorEvent, isEvent, isObject } from '@grafana/frontend-agent-core';
import type { ExceptionStackFrame } from '@grafana/frontend-agent-core';

import { getStackFramesFromError } from './stackFrames';

export function getErrorDetails(event: Error | Event): any {
  let value: string | undefined;
  let type: string | undefined;
  let stackFrames: ExceptionStackFrame[] = [];
  let isDomErrorRes: boolean | undefined;
  let isEventRes: boolean | undefined;

  if (isErrorEvent(event) && event.error) {
    value = event.error.message;
    type = event.error.name;
    stackFrames = getStackFramesFromError(event.error);
  } else if ((isDomErrorRes = isDomError(event)) || isDomException(event)) {
    type = event.name ?? (isDomErrorRes ? 'DOMError' : 'DOMException');
    value = event.message ? `${type}: ${event.message}` : type;
  } else if (isError(event)) {
    value = event.message;
    stackFrames = getStackFramesFromError(event);
  } else if (isObject(event) || (isEventRes = isEvent(event))) {
    type = isEventRes ? event.constructor.name : undefined;
    value = `Non-Error exception captured with keys: ${Object.keys(event)}`;
  }

  return [value, type, stackFrames];
}
