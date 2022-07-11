import type { Config } from '../config';
import { originalConsole } from '../originalConsole';
import { noop } from '../utils';
import type { InternalLogger } from './types';

export let internalLogger: InternalLogger = {
  error: noop,
  info: noop,
  prefix: 'Grafana JavaScript Agent',
  warn: noop,
}

export function initializeInternalLogger(config: Config): InternalLogger {
  const { enableDebug } = config;

  if (enableDebug) {
    internalLogger = {
      ...internalLogger,
      error: function (...args) {
        originalConsole.error.call(this, internalLogger.prefix, ...args);
      },
      info: function (...args) {
        originalConsole.info.call(this, internalLogger.prefix, ...args);
      },
      warn: function (...args) {
        originalConsole.info.call(this, internalLogger.prefix, ...args);
      },
    };
  }

  return internalLogger;
}
