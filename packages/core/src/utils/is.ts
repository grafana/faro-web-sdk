// Helpers

export function is<T = any>(value: any, type: any): value is T {
  return Object.prototype.toString.call(value) === `'[object ${type}]'`;
}

export function isInstanceOf(value: any, reference: any): value is typeof reference {
  try {
    return value instanceof reference;
  } catch (err) {
    return false;
  }
}

export function hasProperties(value: object, ...properties: string[]): boolean {
  return properties.every((property) => property in value);
}

// Basics

export const isUndefined = (value: any) => is<undefined>(value, 'Undefined');

export const isNull = (value: any) => is<null>(value, 'Null');

export const isString = (value: any) => is<string>(value, 'String');

export const isNumber = (value: any) => (is<number>(value, 'Number') && !isNaN(value)) || is<bigint>(value, 'BigInt');

export const isBoolean = (value: any) => is<boolean>(value, 'Boolean');

export const isObject = (value: any): value is object => !isNull(value) && is<object>(value, 'Object');

export const isFunction = (value: any) => is<Function>(value, 'Function');

export const isSymbol = (value: any) => is<symbol>(value, 'Symbol');

export const isArray = (value: any) => is<any[]>(value, 'Array');

export const isRegExp = (value: any) => is<RegExp>(value, 'RegExp');

//

export const isThenable = (value: any) => isFunction(value?.then);

export const isEvent = (value: any) => !isUndefined(Event) && isInstanceOf(value, Event);

export const isErrorEvent = (value: any) => is<ErrorEvent>(value, 'ErrorEvent');

export const isDomError = (value: any) => is(value, 'DOMError');

export const isDomException = (value: any) => is<DOMException>(value, 'DOMException');

export const isElement = (value: any) => !isUndefined(Element) && isInstanceOf(value, Element);

export const isSyntheticEvent = (value: any) =>
  isObject(value) && hasProperties(value, 'nativeEvent', 'preventDefault', 'stopPropagation');
