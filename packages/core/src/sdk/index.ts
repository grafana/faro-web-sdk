export { internalGlobalObjectKey } from './const';

export { faro, registerFaro } from './registerFaro';

export {
  getInternalFromGlobalObject as getInternalFaroFromGlobalObject,
  isInternalFaroOnGlobalObject as isInternalFaroOnGlobalObject,
  setInternalFaroOnGlobalObject as setInternalFaroOnGlobalObject,
} from './internalFaroGlobalObject';

export type { Faro } from './types';
