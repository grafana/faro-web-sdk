import { Config, config } from './config';
import { Logger, logger } from './logger';
import { getMetaValues, MetaValues } from './meta';

export interface WindowObject {
  config: Config;
  logger: Logger;
  meta: MetaValues;
}

export function initializeWindowObject() {
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
