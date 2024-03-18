import { isDomError, isDomException, isError, isErrorEvent, isEvent, isObject } from '@grafana/faro-core';
import type { ExceptionStackFrame } from '@grafana/faro-core';

import { domErrorType, domExceptionType, objectEventValue } from './const';
import { getStackFramesFromError } from './stackFrames';
import { buildFilenameBundleIdMap } from './stackFrames/buildFilenameBundleIdMap';
import type { ErrorEvent } from './types';

export function getErrorDetails(evt: ErrorEvent): [string | undefined, string | undefined, ExceptionStackFrame[]] {
  let value: string | undefined;
  let type: string | undefined;
  let stackFrames: ExceptionStackFrame[] = [];
  let isDomErrorRes: boolean | undefined;
  let isEventRes: boolean | undefined;
  let fileNameBundleIdMap: Map<string, string> | undefined;

  if (isErrorEvent(evt) && evt.error) {
    fileNameBundleIdMap = buildFilenameBundleIdMap(evt.error);

    value = evt.error.message;
    type = evt.error.name;
    stackFrames = getStackFramesFromError(evt.error, fileNameBundleIdMap);
  } else if ((isDomErrorRes = isDomError(evt)) || isDomException(evt)) {
    const { name, message } = evt;

    type = name ?? (isDomErrorRes ? domErrorType : domExceptionType);
    value = message ? `${type}: ${message}` : type;
  } else if (isError(evt)) {
    fileNameBundleIdMap = buildFilenameBundleIdMap(evt);

    value = evt.message;
    stackFrames = getStackFramesFromError(evt, fileNameBundleIdMap);
  } else if (isObject(evt) || (isEventRes = isEvent(evt))) {
    type = isEventRes ? evt.constructor.name : undefined;
    value = `${objectEventValue} ${Object.keys(evt)}`;
  }

  return [value, type, stackFrames];
}
