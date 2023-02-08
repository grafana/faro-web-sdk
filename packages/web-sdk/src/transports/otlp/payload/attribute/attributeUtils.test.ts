import type { MetaAttributes } from '@grafana/faro-core';

import { toAttribute, toAttributeValue } from './attributeUtils';

describe('toAttribute()', () => {
  it.each([undefined, null, ''])('toAttribute() returns "undefined" if attributeValue is: %p.', (attributeValue) => {
    const attribute = toAttribute('attribute.name', attributeValue);
    expect(attribute).toBe(undefined);
  });

  it(' parameter "attributeType" is set to string by default.', () => {
    const attribute = toAttribute('attribute.name', 'abc');
    expect(attribute?.value).toHaveProperty('stringValue');
  });

  it('returns valid attribute objects for given parameters.', () => {
    const attributeName = 'attribute.name';
    const attributeValue = 'string-value';

    const attribute = toAttribute('attribute.name', attributeValue);

    expect(attribute).toMatchObject({
      key: attributeName,
      value: { stringValue: attributeValue },
    });
  });

  it('toNestedAttribute() returns a nested attributes object.', () => {
    const metaAttributes: MetaAttributes = {
      'attribute.one': 'hello',
      'attribute.two': 'world',
    };

    const attribute = toAttribute('attribute.name', metaAttributes);
    expect(attribute).toMatchObject({
      key: 'attribute.name',
      value: {
        kvlistValue: {
          values: [
            {
              key: 'attribute.one',
              value: {
                stringValue: 'hello',
              },
            },
            {
              key: 'attribute.two',
              value: {
                stringValue: 'world',
              },
            },
          ],
        },
      },
    });
  });
});

describe('toAttributeValue()', () => {
  const cases = [
    { v: 'hello', expected: { stringValue: 'hello' } },
    { v: 1, expected: { intValue: 1 } },
    { v: 1.23, expected: { doubleValue: 1.23 } },
    { v: true, expected: { boolValue: true } },
    { v: ['foo', 'bar'], expected: { arrayValue: { values: [{ stringValue: 'foo' }, { stringValue: 'bar' }] } } },
    { v: new Uint8Array(2), expected: { bytesValue: { '0': 0, '1': 0 } } },
    {
      v: {
        a: 'a',
        o1: { f: 'f' },
        list: ['c', { obj2: { e: 'e' } }],
      },
      expected: {
        kvlistValue: {
          values: [
            {
              key: 'a',
              value: { stringValue: 'a' },
            },
            {
              key: 'o1',
              value: {
                kvlistValue: {
                  values: [
                    {
                      key: 'f',
                      value: { stringValue: 'f' },
                    },
                  ],
                },
              },
            },
            {
              key: 'list',
              value: {
                arrayValue: {
                  values: [
                    { stringValue: 'c' },
                    {
                      kvlistValue: {
                        values: [
                          {
                            key: 'obj2',
                            value: {
                              kvlistValue: {
                                values: [
                                  {
                                    key: 'e',
                                    value: { stringValue: 'e' },
                                  },
                                ],
                              },
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            },
          ],
        },
      },
    },
  ] as const;

  it.each(cases)('Returns $expected for value $v.', ({ v, expected }) => {
    expect(toAttributeValue(v)).toMatchObject(expected);
  });
});
