import { sendRequest } from '../api';
import type { BaseObject } from '../utils/baseObject';
import { getCurrentTimestamp } from '../utils/getCurrentTimestamp';

export enum LoggerLogLevels {
  TRACE = 'trace',
  DEBUG = 'debug',
  INFO = 'info',
  LOG = 'log',
  WARN = 'warn',
  ERROR = 'error',
}

export type LoggerLogContext = BaseObject;

export function log(args: unknown[], level = LoggerLogLevels.LOG, context: LoggerLogContext = {}) {
  try {
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
          timestamp: getCurrentTimestamp(),
        },
      ],
    });
  } catch (err) {}
}
