import type { Meta } from '../meta';
import { TransportItemType } from '../transports';
import type { Transports } from '../transports';
import { getCurrentTimestamp } from '../utils/getCurrentTimestamp';
import { isString } from '../utils/is';
import { getStackFramesFromError } from './stackFrames';
import type { StackFrame } from './stackFrames';

export interface ExceptionEvent {
  stacktrace: {
    frames: StackFrame[];
  };
  timestamp: string;
  type: 'Error';
  value: string;
}

export interface Exception {
  pushException: (event?: string | Event, filename?: string, lineno?: number, colno?: number, error?: Error) => void;
}

export function initializeException(transports: Transports, meta: Meta): Exception {
  const getInitialStackFrame = (filename: string, lineno: number | null, colno: number | null) => {
    const stackFrame: StackFrame = {
      filename,
      function: '?',
    };

    if (isString(lineno)) {
      stackFrame.lineno = lineno!;
    }

    if (isString(colno)) {
      stackFrame.colno = colno!;
    }

    return stackFrame;
  };

  const pushException: Exception['pushException'] = (_event, filename, lineno, colno, error) => {
    try {
      transports.execute({
        type: TransportItemType.EXCEPTIONS,
        payload: {
          type: 'Error',
          value: error.message,
          stacktrace: {
            frames: [getInitialStackFrame(filename, lineno, colno), ...getStackFramesFromError(error)],
          },
          timestamp: getCurrentTimestamp(),
        },
        meta: meta.values,
      });
    } catch (err) {}
  };

  const pushExceptionFromSource: Exception['pushExceptionFromSource'] = (message, filename, lineno, colno) => {
    try {
      const groups = message.match(
        /^(?:[Uu]ncaught (?:exception: )?)?(?:((?:Eval|Internal|Range|Reference|Syntax|Type|URI|)Error): )?(.*)$/i
      );

      console.debug(groups);

      transports.execute({
        type: TransportItemType.EXCEPTIONS,
        payload: {
          type: 'Error',
          value: message,
          stacktrace: {
            frames: [getInitialStackFrame(filename, lineno, colno)],
          },
          timestamp: getCurrentTimestamp(),
        },
        meta: meta.values,
      });
    } catch (err) {}
  };

  return {
    pushExceptionFromError,
    pushExceptionFromSource,
  };
}
