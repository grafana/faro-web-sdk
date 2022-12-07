import { isArray, isObject, isTypeof } from './is';

// This function was inspired by fast-deep-equal
// fast-deep-equal has issues with Rollup and also it checks for some edge cases that we don't need

export function deepEqual(a: any, b: any): boolean {
  if (a === b) {
    return true;
  }

  // Using isTypeOf instead of isNumber as isNumber also checks against NaN
  if (isTypeof(a, 'number') && isNaN(a as number)) {
    return isTypeof(b, 'number') && isNaN(b as number);
  }

  const aIsArray = isArray(a);
  const bIsArray = isArray(b);

  if (aIsArray !== bIsArray) {
    return false;
  }

  if (aIsArray && bIsArray) {
    const length = a.length;

    if (length !== b.length) {
      return false;
    }

    for (let idx = length; idx-- !== 0; ) {
      if (!deepEqual(a[idx], b[idx])) {
        return false;
      }
    }

    return true;
  }

  const aIsObject = isObject(a);
  const bIsObject = isObject(b);

  if (aIsObject !== bIsObject) {
    return false;
  }

  if (a && b && aIsObject && bIsObject) {
    const aKeys = Object.keys(a) as Array<keyof typeof a>;
    const bKeys = Object.keys(b);
    const aLength = aKeys.length;
    const bLength = bKeys.length;

    if (aLength !== bLength) {
      return false;
    }

    for (let aKey of aKeys) {
      if (!bKeys.includes(aKey)) {
        return false;
      }
    }

    for (let aKey of aKeys) {
      if (!deepEqual(a[aKey], b[aKey])) {
        return false;
      }
    }

    return true;
  }

  return false;
}
