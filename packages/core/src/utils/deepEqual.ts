// This function was inspired by fast-deep-equal
// fast-deep-equal has issues with Rollup and also it checks for some edge cases that we don't need

export function deepEqual(a: any, b: any): boolean {
  if (a === b) {
    return true;
  }

  // Using typeof instead of isNumber as isNumber also checks against NaN
  if (typeof a === 'number' && isNaN(a)) {
    return typeof b === 'number' && isNaN(b);
  }

  const aIsArray = Array.isArray(a);
  const bIsArray = Array.isArray(b);

  if (aIsArray !== bIsArray) {
    return false;
  }

  if (aIsArray && bIsArray) {
    if (a.length !== b.length) {
      return false;
    }

    for (let idx = a.length; idx-- !== 0; ) {
      if (!deepEqual(a[idx], b[idx])) {
        return false;
      }
    }

    return true;
  }

  // Both must be non-null objects at this point
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') {
    return false;
  }

  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);

  if (aKeys.length !== bKeys.length) {
    return false;
  }

  for (const key of aKeys) {
    if (!bKeys.includes(key) || !deepEqual(a[key], b[key])) {
      return false;
    }
  }

  return true;
}
