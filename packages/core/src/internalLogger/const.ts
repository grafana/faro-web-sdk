import { noop } from '../utils';

import type { InternalLogger } from './types';

export enum InternalLoggerLevel {
  OFF = 0,
  ERROR = 1,
  WARN = 2,
  INFO = 3,
  VERBOSE = 4,
}

export const defaultInternalLoggerPrefix = 'Faro';

export const defaultInternalLogger: InternalLogger = {
  debug: noop,
  error: noop,
  info: noop,
  prefix: defaultInternalLoggerPrefix,
  warn: noop,
} as const;

export const defaultInternalLoggerLevel = InternalLoggerLevel.ERROR;
