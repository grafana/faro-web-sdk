import { isDomError, isDomException, isError, isErrorEvent, isEvent, isObject, isString } from '@grafana/faro-core';
import type { ExceptionStackFrame, LogArgsSerializer } from '@grafana/faro-core';

import { domErrorType, domExceptionType, objectEventValue, unknownSymbolString } from './const';
import { getValueAndTypeFromMessage } from './getValueAndTypeFromMessage';
import { buildStackFrame, getStackFramesFromError } from './stackFrames';
import type { ErrorEvent } from './types';

export function getErrorDetails(evt: ErrorEvent): [string | undefined, string | undefined, ExceptionStackFrame[]] {
  let value: string | undefined;
  let type: string | undefined;
  let stackFrames: ExceptionStackFrame[] = [];
  let isDomErrorRes: boolean | undefined;
  let isEventRes: boolean | undefined;

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
  } else if (isObject(evt) || (isEventRes = isEvent(evt))) {
    type = isEventRes ? evt.constructor.name : undefined;
    value = `${objectEventValue} ${Object.keys(evt)}`;
  }

  return [value, type, stackFrames];
}

export interface ErrorDetails {
  value?: string;
  type?: string;
  stackFrames?: ExceptionStackFrame[];
}

export function getDetailsFromErrorArgs(args: [any?, ...any[]]): ErrorDetails {
  const [evt, source, lineno, colno, error] = args;

  let value: string | undefined;
  let type: string | undefined;
  let stackFrames: ExceptionStackFrame[] = [];
  const eventIsString = isString(evt);
  const initialStackFrame = buildStackFrame(source, unknownSymbolString, lineno, colno);

  if (error || !eventIsString) {
    [value, type, stackFrames] = getErrorDetails((error ?? evt) as Error | Event);

    if (stackFrames.length === 0) {
      stackFrames = [initialStackFrame];
    }
  } else if (eventIsString) {
    [value, type] = getValueAndTypeFromMessage(evt);
    stackFrames = [initialStackFrame];
  }

  return { value, type, stackFrames };
}

export function getDetailsFromConsoleErrorArgs(args: [any?, ...any[]], serializer: LogArgsSerializer): ErrorDetails {
  if (isError(args[0])) {
    return getDetailsFromErrorArgs(args);
  } else {
    return { value: serializer(args) };
  }
}
