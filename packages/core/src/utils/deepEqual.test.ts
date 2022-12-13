import { deepEqual } from './deepEqual';

describe('deepEqual', () => {
  it('correctly checks null and undefined', () => {
    expect(deepEqual(null, null)).toBe(true);
    expect(deepEqual(undefined, undefined)).toBe(true);
    expect(deepEqual(null, undefined)).toBe(false);
    expect(deepEqual(undefined, null)).toBe(false);
    expect(deepEqual(undefined, '')).toBe(false);
    expect(deepEqual(null, '')).toBe(false);
    expect(deepEqual(undefined, 0)).toBe(false);
    expect(deepEqual(null, 0)).toBe(false);
    expect(deepEqual(undefined, false)).toBe(false);
    expect(deepEqual(null, false)).toBe(false);
    expect(deepEqual(undefined, {})).toBe(false);
    expect(deepEqual(null, {})).toBe(false);
    expect(deepEqual(undefined, [])).toBe(false);
    expect(deepEqual(null, [])).toBe(false);
  });

  it('correctly checks numbers', () => {
    expect(deepEqual(1, 1)).toBe(true);
    expect(deepEqual(1, 2)).toBe(false);
    expect(deepEqual(1, null)).toBe(false);
    expect(deepEqual(1, undefined)).toBe(false);
    expect(deepEqual(NaN, NaN)).toBe(true);
    expect(deepEqual(1, NaN)).toBe(false);
    expect(deepEqual(0, null)).toBe(false);
    expect(deepEqual(0, undefined)).toBe(false);
    expect(deepEqual(1, true)).toBe(false);
    expect(deepEqual(0, false)).toBe(false);
    expect(deepEqual(0, -0)).toBe(true);
    expect(deepEqual(Infinity, Infinity)).toBe(true);
    expect(deepEqual(Infinity, -Infinity)).toBe(false);
  });

  it('correctly checks strings', () => {
    expect(deepEqual('1', '1')).toBe(true);
    expect(deepEqual('1', '2')).toBe(false);
    expect(deepEqual('', null)).toBe(false);
    expect(deepEqual('', undefined)).toBe(false);
    expect(deepEqual('1', true)).toBe(false);
    expect(deepEqual('', false)).toBe(false);
  });

  it('correctly checks booleans', () => {
    expect(deepEqual(true, true)).toBe(true);
    expect(deepEqual(false, false)).toBe(true);
    expect(deepEqual(true, false)).toBe(false);
    expect(deepEqual(false, null)).toBe(false);
    expect(deepEqual(false, undefined)).toBe(false);
  });

  it('correctly checks arrays', () => {
    expect(deepEqual([], [])).toBe(true);
    expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true);
    expect(deepEqual([1, 2, 3], [1, 2, 4])).toBe(false);
    expect(deepEqual([1, 2, 3], [1, 2])).toBe(false);
    expect(deepEqual([{ a: 'a' }, { b: 'b' }], [{ a: 'a' }, { b: 'b' }])).toBe(true);
    expect(deepEqual([{ a: 'a' }, { b: 'b' }], [{ a: 'a' }, { b: 'c' }])).toBe(false);
    expect(deepEqual({ '0': 0, '1': 1, length: 2 }, [0, 1])).toBe(false);
  });

  it('correctly checks objects', () => {
    expect(deepEqual({}, {})).toBe(true);
    expect(deepEqual({ a: 1, b: '2' }, { a: 1, b: '2' })).toBe(true);
    expect(deepEqual({ a: 1, b: '2' }, { b: '2', a: 1 })).toBe(true);
    expect(deepEqual({ a: 1, b: '2' }, { a: 1, b: '2', c: [] })).toBe(false);
    expect(deepEqual({ a: 1, b: '2', c: 3 }, { a: 1, b: '2', c: 4 })).toBe(false);
    expect(deepEqual({ a: 1, b: '2', c: 3 }, { a: 1, b: '2', d: 3 })).toBe(false);
    expect(deepEqual({ a: [{ b: 'c' }] }, { a: [{ b: 'c' }] })).toBe(true);
    expect(deepEqual({ a: [{ b: 'c' }] }, { a: [{ b: 'd' }] })).toBe(false);
    expect(deepEqual({ a: [{ b: 'c' }] }, { a: [{ c: 'c' }] })).toBe(false);
    expect(deepEqual({}, [])).toBe(false);
    expect(deepEqual({}, { foo: undefined })).toBe(false);
    expect(deepEqual({ foo: undefined }, {})).toBe(false);
    expect(deepEqual({ foo: undefined }, { bar: undefined })).toBe(false);
  });

  it('correctly checks complex objects', () => {
    expect(
      deepEqual(
        {
          prop1: 'value1',
          prop2: 'value2',
          prop3: 'value3',
          prop4: {
            subProp1: 'sub value1',
            subProp2: {
              subSubProp1: 'sub sub value1',
              subSubProp2: [1, 2, { prop2: 1, prop: 2 }, 4, 5],
            },
          },
          prop5: 1000,
        },
        {
          prop5: 1000,
          prop3: 'value3',
          prop1: 'value1',
          prop2: 'value2',
          prop4: {
            subProp2: {
              subSubProp1: 'sub sub value1',
              subSubProp2: [1, 2, { prop2: 1, prop: 2 }, 4, 5],
            },
            subProp1: 'sub value1',
          },
        }
      )
    ).toBe(true);
  });
});
