// This does not uses isUndefined method because it will throw an error in non-browser environments
export const globalObject = typeof window === 'undefined' ? global : window;
