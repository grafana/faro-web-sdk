import type { MetaAttributes } from 'packages/core/src/metas';
import { toAttribute } from './attributeUtils';

describe('attributeUtils', () => {
  test.each([undefined, null, ''])('toAttribute() returns "undefined" if attributeValue is: %p.', (attributeValue) => {
    const attribute = toAttribute('attribute.name', attributeValue);
    expect(attribute).toBe(undefined);
  });

  test('toAttribute() parameter "attributeType" is set to string by default.', () => {
    const attribute = toAttribute('attribute.name', 'abc');
    expect(attribute?.value).toHaveProperty('stringValue');
  });

  test('toAttribute() returns valid attribute objects for given parameters.', () => {
    const attributeName = 'attribute.name';
    const attributeValue = 'string-value';

    const attribute = toAttribute('attribute.name', attributeValue);

    expect(attribute).toMatchObject({
      key: attributeName,
      value: { stringValue: attributeValue },
    });
  });

  test('toNestedAttribute() returns a nested attributes object.', () => {
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
