import type { InternalLogger } from '../internalLogger';
import { setFaroOnGlobalObject } from './faroGlobalObject';
import { setInternalFaroOnGlobalObject } from './internalFaroGlobalObject';
import type { Faro } from './types';

export let faro: Faro = {} as Faro;

export function registerFaro(internalLogger: InternalLogger, newFaro: Faro): Faro {
  internalLogger.debug('Initializing Faro');

  faro = newFaro;

  setInternalFaroOnGlobalObject(faro);

  setFaroOnGlobalObject(faro);

  return faro;
}
