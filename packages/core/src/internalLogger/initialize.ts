import type { Config } from '../config';
import type { UnpatchedConsole } from '../unpatchedConsole';
import { noop } from '../utils';
import { InternalLoggerLevel } from './const';
import type { InternalLogger } from './types';

export let internalLogger: InternalLogger = {
  debug: noop,
  error: noop,
  info: noop,
  prefix: 'Grafana JavaScript Agent',
  warn: noop,
};

export function initializeInternalLogger(unpatchedConsole: UnpatchedConsole, config: Config): InternalLogger {
  const { internalLoggerLevel = InternalLoggerLevel.ERROR } = config;

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
