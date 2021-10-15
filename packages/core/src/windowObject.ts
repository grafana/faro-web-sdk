import { config } from './config';
import type { Config } from './config';
import { drain, getBufferCopy, pushEvent, pushExceptionFromError, pushExceptionFromSource, pushLog } from './logger';
import type { LoggerBuffer } from './logger';
import { getMetaValues } from './meta';
import type { MetaValues } from './meta';

export interface WindowObject {
  config: Config;
  logger: {
    buffer: LoggerBuffer;
    drain: typeof drain;
    pushEvent: typeof pushEvent;
    pushExceptionFromError: typeof pushExceptionFromError;
    pushExceptionFromSource: typeof pushExceptionFromSource;
    pushLog: typeof pushLog;
  };
  meta: MetaValues;
}

export function initializeWindowObject(): void {
  if (!config.preventWindowExposure) {
    const value: WindowObject = {
      config,
      logger: {
        get buffer() {
          return getBufferCopy();
        },
        drain,
        pushEvent,
        pushExceptionFromError,
        pushExceptionFromSource,
        pushLog,
      },
      get meta() {
        return getMetaValues();
      },
    };

    Object.defineProperty(window, config.windowObjectKey, {
      configurable: false,
      enumerable: true,
      value,
      writable: false,
    });
  }
}
