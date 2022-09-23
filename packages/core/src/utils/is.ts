export type IsFnHelper<T = unknown> = (value: unknown) => value is T;

export function isTypeof<T = unknown>(value: unknown, type: string): value is T {
  return typeof value === type;
}

export function isToString<T = unknown>(value: unknown, type: string): value is T {
  return Object.prototype.toString.call(value) === `[object ${type}]`;
}

export function isInstanceOf<T extends Function = any>(value: unknown, reference: T): value is T {
  try {
    return value instanceof reference;
  } catch (err) {
    return false;
  }
}

export const isUndefined = ((value) => isTypeof(value, 'undefined')) as IsFnHelper<undefined>;

export const isNull = ((value) => isTypeof(value, 'null')) as IsFnHelper<null>;

export const isString = ((value) => isTypeof(value, 'string')) as IsFnHelper<string>;

export const isNumber = ((value) =>
  (isTypeof<number>(value, 'number') && !isNaN(value)) || isTypeof(value, 'bigint')) as IsFnHelper<number | bigint>;

export const isInt = ((value) => isNumber(value) && Number.isInteger(value)) as IsFnHelper<number>;

export const isBoolean = ((value) => isTypeof(value, 'boolean')) as IsFnHelper<boolean>;

export const isSymbol = ((value) => isTypeof(value, 'symbol')) as IsFnHelper<Symbol>;

export const isObject = ((value) => !isNull(value) && isTypeof(value, 'object')) as IsFnHelper<object>;

export const isFunction = ((value) => isTypeof(value, 'function')) as IsFnHelper<Function>;

export const isArray = ((value) => isToString(value, 'Array')) as IsFnHelper<unknown[]>;

export const isRegExp = ((value) => isToString(value, 'RegExp')) as IsFnHelper<string>;

export const isThenable = ((value) => isFunction((value as any)?.then)) as IsFnHelper<{ then: Function }>;

export const isPrimitive = ((value) => !isObject(value) && !isFunction(value)) as IsFnHelper<
  string | number | bigint | boolean | symbol
>;

export const isEventDefined = !isUndefined(Event);

export const isEvent = ((value) => isEventDefined && isInstanceOf(value, Event)) as IsFnHelper<Event>;

export const isErrorDefined = typeof Error !== 'undefined';

export const isError = ((value) => isErrorDefined && isInstanceOf(value, Error)) as IsFnHelper<Error>;

export const isErrorEvent = ((value) => isToString(value, 'ErrorEvent')) as IsFnHelper<ErrorEvent>;

export const isDomError = ((value) => isToString(value, 'DOMError')) as IsFnHelper<DOMException>;

export const isDomException = ((value) => isToString(value, 'DOMException')) as IsFnHelper<DOMException>;

export const isElementDefined = typeof Element !== 'undefined';

export const isElement = ((value) => isElementDefined && isInstanceOf(value, Element)) as IsFnHelper<Element>;

export const isMapDefined = typeof Map !== 'undefined';

export const isMap = ((value) => isMapDefined && isInstanceOf(value, Map)) as IsFnHelper<Map<any, any>>;

export const isSyntheticEvent = ((value) =>
  isObject(value) &&
  'nativeEvent' in value &&
  'preventDefault' in value &&
  'stopPropagation' in value) as IsFnHelper<Event>;
