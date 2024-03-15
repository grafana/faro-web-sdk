import type { Faro, internalGlobalObjectKey } from '../sdk';

export type GlobalObject<T = typeof globalThis | typeof global | typeof self> = T & {
  [label: string]: Faro;

  [internalGlobalObjectKey]: Faro;
};

// This does not uses isUndefined method because it will throw an error in non-browser environments
export const globalObject = (typeof globalThis !== 'undefined'
  ? globalThis
  : typeof global !== 'undefined'
    ? global
    : typeof self !== 'undefined'
      ? self
      : undefined) as unknown as GlobalObject;
