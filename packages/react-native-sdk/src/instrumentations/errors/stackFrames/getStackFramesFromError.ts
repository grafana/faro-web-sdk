import { isNumber } from '@grafana/faro-core';
import type { ExceptionStackFrame, ExtendedError } from '@grafana/faro-core';

import { buildStackFrame } from './buildStackFrame';
import {
  evalString,
  firefoxEvalRegex,
  firefoxEvalString,
  firefoxLineRegex,
  newLineString,
  reactMinifiedRegex,
  webkitAddressAtString,
  webkitAddressAtStringLength,
  webkitEvalRegex,
  webkitEvalString,
  webkitLineRegex,
} from './const';
import { getDataFromSafariExtensions } from './getDataFromSafariExtensions';

export function getStackFramesFromError(error: ExtendedError): ExceptionStackFrame[] {
  let lines: string[] = [];

  if (error.stacktrace) {
    lines = error.stacktrace.split(newLineString).filter((_line, idx) => idx % 2 === 0);
  } else if (error.stack) {
    lines = error.stack.split(newLineString);
  }

  const stackFrames = lines.reduce((acc, line, idx) => {
    let parts: RegExpExecArray | null;
    let func: string | undefined;
    let filename: string | undefined;
    let lineno: string | undefined;
    let colno: string | undefined;

    if ((parts = webkitLineRegex.exec(line))) {
      func = parts[1];
      filename = parts[2];
      lineno = parts[3];
      colno = parts[4];

      if (filename?.startsWith(webkitEvalString)) {
        const submatch = webkitEvalRegex.exec(filename);

        if (submatch) {
          filename = submatch[1];
          lineno = submatch[2];
          colno = submatch[3];
        }
      }

      filename = filename?.startsWith(webkitAddressAtString)
        ? filename.substring(webkitAddressAtStringLength)
        : filename;
      [func, filename] = getDataFromSafariExtensions(func, filename);
    } else if ((parts = firefoxLineRegex.exec(line))) {
      func = parts[1];
      filename = parts[3];
      lineno = parts[4];
      colno = parts[5];

      if (!!filename && filename.includes(firefoxEvalString)) {
        const submatch = firefoxEvalRegex.exec(filename);

        if (submatch) {
          func = func || evalString;
          filename = submatch[1];
          lineno = submatch[2];
        }
      } else if (idx === 0 && !colno && isNumber(error.columnNumber)) {
        colno = String(error.columnNumber! + 1);
      }

      [func, filename] = getDataFromSafariExtensions(func, filename);
    }

    if (filename || func) {
      acc.push(buildStackFrame(filename, func, lineno ? Number(lineno) : undefined, colno ? Number(colno) : undefined));
    }

    return acc;
  }, [] as ExceptionStackFrame[]);

  if (reactMinifiedRegex.test(error.message)) {
    return stackFrames.slice(1);
  }

  return stackFrames;
}
