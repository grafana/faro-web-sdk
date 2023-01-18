import { globalObject } from '../globalObject';

import { internalGlobalObjectKey } from './const';
import type { Faro } from './types';

export function getInternalFromGlobalObject(): Faro | undefined {
  return globalObject[internalGlobalObjectKey];
}

export function setInternalFaroOnGlobalObject(faro: Faro): void {
  if (!faro.config.isolate) {
    faro.internalLogger.debug('Registering internal Faro instance on global object');

    Object.defineProperty(globalObject, internalGlobalObjectKey, {
      configurable: false,
      enumerable: false,
      writable: false,
      value: faro,
    });
  } else {
    faro.internalLogger.debug('Skipping registering internal Faro instance on global object');
  }
}

export function isInternalFaroOnGlobalObject(): boolean {
  return internalGlobalObjectKey in globalObject;
}
