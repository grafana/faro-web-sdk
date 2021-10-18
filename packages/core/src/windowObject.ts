import { config } from './config';
import type { Config } from './config';
import { pushExceptionFromError, pushExceptionFromSource, pushLog } from './logger';
import { getMetaValues } from './meta';
import type { MetaValues } from './meta';
import { drain, getQueueCopy, pushEvent } from './queue';
import type { Queue } from './queue';

export interface WindowObject {
  config: Config;
  logger: {
    pushExceptionFromError: typeof pushExceptionFromError;
    pushExceptionFromSource: typeof pushExceptionFromSource;
    pushLog: typeof pushLog;
  };
  meta: MetaValues;
  queue: {
    value: Queue;
    drain: typeof drain;
    pushEvent: typeof pushEvent;
  };
}

export function initializeWindowObject(): void {
  if (!config.preventWindowExposure) {
    const value: WindowObject = {
      config,
      logger: {
        pushExceptionFromError,
        pushExceptionFromSource,
        pushLog,
      },
      get meta() {
        return getMetaValues();
      },
      queue: {
        drain,
        pushEvent,
        get value() {
          return getQueueCopy();
        },
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
