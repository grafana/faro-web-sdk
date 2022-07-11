import type { Config } from '../config';
import { originalConsole } from '../originalConsole';
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

export function initializeInternalLogger(config: Config): InternalLogger {
  const { internalLoggerLevel = InternalLoggerLevel.ERROR } = config;

  if (internalLoggerLevel > InternalLoggerLevel.OFF) {
    internalLogger.error =
      internalLoggerLevel >= InternalLoggerLevel.ERROR
        ? function (...args) {
            originalConsole.error(internalLogger.prefix, ...args);
          }
        : noop;

    internalLogger.warn =
      internalLoggerLevel >= InternalLoggerLevel.WARN
        ? function (...args) {
            originalConsole.warn(internalLogger.prefix, ...args);
          }
        : noop;

    internalLogger.info =
      internalLoggerLevel >= InternalLoggerLevel.INFO
        ? function (...args) {
            originalConsole.info(internalLogger.prefix, ...args);
          }
        : noop;

    internalLogger.debug =
      internalLoggerLevel >= InternalLoggerLevel.VERBOSE
        ? function (...args) {
            originalConsole.debug(internalLogger.prefix, ...args);
          }
        : noop;
  }

  return internalLogger;
}
