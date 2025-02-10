import { getCircularDependencyReplacer, stringifyExternalJson, stringifyObjectValues } from './json';

describe('json', () => {
  it('replace circular references with null value', () => {
    const replacer = getCircularDependencyReplacer();

    const obj = { a: 1 };
    (obj as any).circular = obj;

    expect(JSON.stringify(obj, replacer)).toBe('{"a":1,"circular":null}');
  });

  it('stringifyExternalJson function replaces circular references with null value', () => {
    const obj = { a: 1 };
    (obj as any).circular = obj;

    expect(stringifyExternalJson(obj)).toBe('{"a":1,"circular":null}');
  });

  it('stringifyObjectValues function stringifies object values', () => {
    const obj = { a: 1, b: { c: 2 }, d: 'foo', e: true, f: [true, 'a', 1], g: null };

    const objectWithStringifiedValues = stringifyObjectValues(obj);
    expect(objectWithStringifiedValues).toStrictEqual({
      a: '1',
      b: '{"c":2}',
      d: 'foo',
      e: 'true',
      f: '[true,\"a\",1]',
      g: 'null',
    });

    Object.values(objectWithStringifiedValues).forEach((key) => {
      expect(typeof key).toBe('string');
    });
  });

  it('stringifyObjectValues function return an empty object if parameter is undefined', () => {
    expect(stringifyObjectValues()).toStrictEqual({});
  });
});
