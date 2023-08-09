export type { BaseObject, BaseObjectKey, BaseObjectPrimitiveValue, BaseObjectValue } from './baseObject';

export { deepEqual } from './deepEqual';

export { getCurrentTimestamp } from './getCurrentTimestamp';

export {
  isArray,
  isBoolean,
  isDomError,
  isDomException,
  isElement,
  isElementDefined,
  isError,
  isErrorDefined,
  isErrorEvent,
  isEvent,
  isEventDefined,
  isFunction,
  isInstanceOf,
  isInt,
  isMap,
  isMapDefined,
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

export { createPromiseBuffer } from './promiseBuffer';
export type { BufferItem, PromiseBuffer, PromiseBufferOptions, PromiseProducer } from './promiseBuffer';

export { genShortID } from './shortId';
