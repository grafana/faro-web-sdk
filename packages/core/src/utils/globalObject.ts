import { isUndefined } from './is';

export const globalObject = isUndefined(window) ? global : window;
