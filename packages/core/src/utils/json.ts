import { isObject } from './is';

export function getCircularDependencyReplacer() {
  const valueSeen = new WeakSet();
  return function (_key: string | Symbol, value: unknown): unknown {
    if (isObject(value) && value !== null) {
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

export function stringifyExternalJson(json: any = {}): string {
  return JSON.stringify(json ?? {}, getCircularDependencyReplacer());
}

export function stringifyObjectValues(obj: Record<string, unknown> = {}): Record<string, string> {
  const o: Record<string, string> = {};

  for (const [key, value] of Object.entries(obj)) {
    o[key] = isObject(value) && value !== null ? stringifyExternalJson(value) : String(value);
  }

  return o;
}
