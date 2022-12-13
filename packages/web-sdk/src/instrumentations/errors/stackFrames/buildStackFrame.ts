import type { ExceptionStackFrame } from '@grafana/faro-core';

import { unknownString } from './const';

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
