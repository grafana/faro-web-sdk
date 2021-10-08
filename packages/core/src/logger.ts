import { sendRequest } from './api';
import { Logger, LoggerLogLevels, StackFrame } from './types';

export function getStackFrames(error: Error): StackFrame[] {
  if (!error || !error.stack) {
    return [];
  }

  return error.stack.split('\n').reduce((arr, line) => {
    let parts: RegExpExecArray | null;
    let submatch: RegExpExecArray | null;

    if (
      (parts =
        /^\s*at (?:(.*?) ?\()?((?:file|https?|blob|chrome-extension|address|native|eval|webpack|<anonymous>|[-a-z]+:|.*bundle|\/).*?)(?::(\d+))?(?::(\d+))?\)?\s*$/i.exec(
          line
        ))
    ) {
      let func = parts[1] ?? '';
      let filename = parts[2] ?? '';
      let lineno = parts[3] ? Number(parts[3]) : -1;
      let colno = parts[4] ? Number(parts[4]) : -1;
      const isNative = filename.startsWith('native');
      const isEval = !isNative && filename.startsWith('eval');

      if (isEval && (submatch = /\((\S*)(?::(\d+))(?::(\d+))\)/.exec(filename))) {
        filename = submatch[1] ?? '';
        lineno = submatch[2] ? Number(submatch[2]) : -1;
        colno = submatch[3] ? Number(submatch[3]) : -1;
      }

      filename = filename.startsWith('address at ') ? filename.substr('address at '.length) : filename;

      arr.push({
        colno,
        filename,
        function: func,
        in_app: true, // TODO: Fix this
        lineno,
      });
    }

    return arr;
  }, [] as StackFrame[]);
}

export const logger: Logger = {
  log: (args, level = LoggerLogLevels.LOG, context = {}) => {
    sendRequest({
      logs: [
        {
          message: args
            .map((arg) => {
              try {
                return String(arg);
              } catch (err) {
                return '';
              }
            })
            .join(' '),
          level,
          context,
          timestamp: new Date().toISOString(),
        },
      ],
    });
  },
  exception: (error) => {
    sendRequest({
      exceptions: [
        {
          type: 'Error',
          value: error.message,
          stacktrace: {
            frames: getStackFrames(error),
          },
          timestamp: new Date().toISOString(),
        },
      ],
    });
  },
};
