import { defaultUnpatchedConsole } from '../unpatchedConsole';
import type { UnpatchedConsole } from '../unpatchedConsole';
import { noop } from '../utils';

import { defaultInternalLogger, defaultInternalLoggerLevel, InternalLoggerLevel } from './const';
import type { InternalLogger } from './types';

export function createInternalLogger(
  unpatchedConsole: UnpatchedConsole = defaultUnpatchedConsole,
  internalLoggerLevel = defaultInternalLoggerLevel
): InternalLogger {
  const internalLogger = defaultInternalLogger;

  if (internalLoggerLevel > InternalLoggerLevel.OFF) {
    internalLogger.error =
      internalLoggerLevel >= InternalLoggerLevel.ERROR
        ? function (...args) {
            unpatchedConsole.error(`${internalLogger.prefix}\n`, ...args);
          }
        : noop;

    internalLogger.warn =
      internalLoggerLevel >= InternalLoggerLevel.WARN
        ? function (...args) {
            unpatchedConsole.warn(`${internalLogger.prefix}\n`, ...args);
          }
        : noop;

    internalLogger.info =
      internalLoggerLevel >= InternalLoggerLevel.INFO
        ? function (...args) {
            unpatchedConsole.info(`${internalLogger.prefix}\n`, ...args);
          }
        : noop;

    internalLogger.debug =
      internalLoggerLevel >= InternalLoggerLevel.VERBOSE
        ? function (...args) {
            unpatchedConsole.debug(`${internalLogger.prefix}\n`, ...args);
          }
        : noop;
  }

  return internalLogger;
}
