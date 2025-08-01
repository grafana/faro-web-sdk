import { getCircularDependencyReplacer, stringifyExternalJson } from './json';

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
});
