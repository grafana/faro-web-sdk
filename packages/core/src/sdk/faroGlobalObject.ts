import { globalObject } from '../globalObject';

import type { Faro } from './types';

export function setFaroOnGlobalObject(faro: Faro): void {
  if (!faro.config.preventGlobalExposure) {
    faro.internalLogger.debug(
      `Registering public faro reference in the global scope using "${faro.config.globalObjectKey}" key`
    );

    if (faro.config.globalObjectKey in globalObject) {
      faro.internalLogger.warn(
        `Skipping global registration due to key "${faro.config.globalObjectKey}" being used already. Please set "globalObjectKey" to something else or set "preventGlobalExposure" to "true"`
      );

      return;
    }

    Object.defineProperty(globalObject, faro.config.globalObjectKey, {
      configurable: false,
      writable: false,
      value: faro,
    });
  } else {
    faro.internalLogger.debug('Skipping registering public Faro instance in the global scope');
  }
}
