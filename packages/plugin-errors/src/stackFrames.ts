import type { ExceptionStackFrame } from '@grafana/frontend-agent-core';
import { isNumber } from '@grafana/frontend-agent-core';

import {
  atString,
  chromeAddressAtString,
  chromeAddressAtStringLength,
  chromeEvalRegex,
  chromeEvalString,
  chromeLineRegex,
  evalString,
  firefoxEvalRegex,
  firefoxEvalString,
  firefoxLineRegex,
  msLineRegex,
  newLineString,
  opera10LineRegex,
  opera11LineRegex,
  reactMinifiedRegex,
  safariExtensionString,
  safariWebExtensionString,
  unknownString,
} from './const';
import type { ExtendedError } from './extendedError';

export function getDataFromSafariExtensions(
  func: string | undefined,
  filename: string | undefined
): [string | undefined, string | undefined] {
  const isSafariExtension = func?.includes(safariExtensionString);
  const isSafariWebExtension = !isSafariExtension && func?.includes(safariWebExtensionString);

  if (!isSafariExtension && !isSafariWebExtension) {
    return [func, filename];
  }

  return [
    func?.includes(atString) ? func.split(atString)[0] : func,
    isSafariExtension ? `${safariExtensionString}:${filename}` : `${safariWebExtensionString}:${filename}`,
  ];
}

export function buildStackFrame(
  filename: string | undefined,
  func: string | undefined,
  lineno: number | undefined,
  colno: number | undefined
): ExceptionStackFrame {
  const stackFrame: ExceptionStackFrame = {
    filename: filename || document.location.href,
    function: func || unknownString,
  };

  if (lineno !== undefined) {
    stackFrame.lineno = lineno;
  }

  if (colno !== undefined) {
    stackFrame.colno = colno;
  }

  return stackFrame;
}

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

    if ((parts = chromeLineRegex.exec(line))) {
      func = parts[1];
      filename = parts[2];
      lineno = parts[3];
      colno = parts[4];

      if (filename?.startsWith(chromeEvalString)) {
        const submatch = chromeEvalRegex.exec(filename);

        if (submatch) {
          filename = submatch[1];
          lineno = submatch[2];
          colno = submatch[3];
        }
      }

      filename = filename?.startsWith(chromeAddressAtString) ? filename.substr(chromeAddressAtStringLength) : filename;
      [func, filename] = getDataFromSafariExtensions(func, filename);
    } else if ((parts = msLineRegex.exec(line))) {
      func = parts[1];
      filename = parts[2];
      lineno = parts[3];
      colno = parts[4];
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
    } else if ((parts = opera10LineRegex.exec(line))) {
      filename = parts[2];
      func = parts[3];
      lineno = parts[1];
    } else if ((parts = opera11LineRegex.exec(line))) {
      filename = parts[6];
      func = parts[3] || parts[4];
      lineno = parts[1];
      colno = parts[2];
    }

    if (filename || func) {
      acc.push(buildStackFrame(filename, func, lineno ? Number(lineno) : undefined, colno ? Number(colno) : undefined));
    }

    return acc;
  }, [] as ExceptionStackFrame[]);

  if (error.framesToPop) {
    return stackFrames.slice(error.framesToPop);
  }

  if (reactMinifiedRegex.test(error.message)) {
    return stackFrames.slice(1);
  }

  return stackFrames;
}
