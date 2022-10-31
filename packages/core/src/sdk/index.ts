export { internalGlobalObjectKey } from './const';

export { faro, registerFaro } from './register';

export {
  getInternalFromGlobalObject as getInternalFaroFromGlobalObject,
  isInternalFaroOnGlobalObject as isInternalFaroOnGlobalObject,
  setInternalFaroOnGlobalObject as setInternalFaroOnGlobalObject,
} from './internalFaroGlobalObject';

export type { Faro } from './types';
