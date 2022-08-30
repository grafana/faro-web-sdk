import type { Agent, internalGlobalObjectKey } from '../agent';

export type GlobalObject<T = typeof window | typeof global> = T & {
  [label: string]: Agent;

  [internalGlobalObjectKey]: Agent;
};

// This does not uses isUndefined method because it will throw an error in non-browser environments
export const globalObject = (typeof window === 'undefined' ? global : window) as GlobalObject;
