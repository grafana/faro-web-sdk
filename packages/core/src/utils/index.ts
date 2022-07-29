export { BaseExtension } from './extensions';
export type { Extension } from './extensions';

export type { BaseObject, BaseObjectKey, BaseObjectPrimitiveValue, BaseObjectValue } from './baseObject';

export { getCurrentTimestamp } from './getCurrentTimestamp';

export { globalObject } from './globalObject';

export {
  isArray,
  isBoolean,
  isDomError,
  isDomException,
  isElement,
  isError,
  isErrorEvent,
  isEvent,
  isFunction,
  isInstanceOf,
  isInt,
  isNull,
  isNumber,
  isObject,
  isPrimitive,
  isRegExp,
  isString,
  isSymbol,
  isSyntheticEvent,
  isThenable,
  isToString,
  isTypeof,
  isUndefined,
} from './is';
export type { IsFnHelper } from './is';

export { allLogLevels, defaultLogLevel, LogLevel } from './logLevels';

export { noop } from './noop';

export * from './promiseBuffer';
