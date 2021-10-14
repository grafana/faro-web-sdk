import { config } from './config';
import type { Config } from './config';
import { logger } from './logger';
import type { Logger } from './logger';
import { getMetaValues } from './meta';
import type { MetaValues } from './meta';

export interface WindowObject {
  config: Config;
  logger: Logger;
  meta: MetaValues;
}

export function initializeWindowObject(): void {
  if (!config.preventWindowExposure) {
    Object.defineProperty(window, config.windowObjectKey, {
      configurable: false,
      enumerable: true,
      value: {
        config,
        logger,
        get meta() {
          return getMetaValues();
        },
      } as WindowObject,
      writable: false,
    });
  }
}
