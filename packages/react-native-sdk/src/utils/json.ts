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

type JSONObject = {
  [key: string]: JSONValue;
};
type JSONArray = JSONValue[] & {};
type JSONValue = string | number | boolean | null | JSONObject | JSONArray;

export function stringifyExternalJson(json: any = {}) {
  return JSON.stringify(json ?? {}, getCircularDependencyReplacer());
}
