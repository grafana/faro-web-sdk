import { type ExceptionStackFrame, isError, isString, LogArgsSerializer } from '@grafana/faro-core';

import { buildStackFrame } from '../instrumentations';
import { unknownSymbolString } from '../instrumentations/errors/const';
import { getErrorDetails } from '../instrumentations/errors/getErrorDetails';
import { getValueAndTypeFromMessage } from '../instrumentations/errors/getValueAndTypeFromMessage';

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
