import { isDomError, isDomException, isError, isErrorEvent } from '@grafana/faro-core';
import type { ExceptionStackFrame } from '@grafana/faro-core';

import { domErrorType, domExceptionType } from './const';
import { getStackFramesFromError } from './stackFrames';
import type { ErrorEvent } from './types';

export function getErrorDetails(evt: ErrorEvent): [string | undefined, string | undefined, ExceptionStackFrame[]] {
  let value: string | undefined;
  let type: string | undefined;
  let stackFrames: ExceptionStackFrame[] = [];
  let isDomErrorRes: boolean | undefined;

  if (isErrorEvent(evt) && evt.error) {
    value = evt.error.message;
    type = evt.error.name;
    stackFrames = getStackFramesFromError(evt.error);
  } else if ((isDomErrorRes = isDomError(evt)) || isDomException(evt)) {
    const { name, message } = evt;

    type = name ?? (isDomErrorRes ? domErrorType : domExceptionType);
    value = message ? `${type}: ${message}` : type;
  } else if (isError(evt)) {
    value = evt.message;
    stackFrames = getStackFramesFromError(evt);
  }

  return [value, type, stackFrames];
}
