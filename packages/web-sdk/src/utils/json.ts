export function getCircularDependencyReplacer() {
  const valueSeen = new WeakSet();
  return function (_key: string | Symbol, value: unknown) {
    if (typeof value === 'object' && value !== null) {
      if (valueSeen.has(value)) {
        return null;
      }
      valueSeen.add(value);
    }
    return value;
  };
}
