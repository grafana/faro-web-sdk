import type { MetaAttributes } from 'packages/core/dist/types';
import type { AttributeTypes, FaroResourceAttributes } from './types';

export const attributeValueType = {
  bool: 'boolValue',
  string: 'stringValue',
  kvList: 'kvListValue',
} as const;

export function toAttribute<T>(
  attributeName: T,
  attributeValue: any,
  attributeType: AttributeTypes = attributeValueType.string
) {
  if (attributeValue == null || attributeValue === '') {
    return;
  }

  return {
    key: attributeName,
    value: { [attributeType]: attributeValue },
  };
}

export function toAttributesList(attributes: MetaAttributes) {
  return Object.entries(attributes).map(([attributeName, attributeValue]) =>
    toAttribute(attributeName, attributeValue)
  );
}

export function toNestedAttributes(attributeName: FaroResourceAttributes, attributes?: MetaAttributes) {
  if (!attributes || Object.keys(attributes).length === 0) {
    return;
  }

  return toAttribute(
    attributeName,
    {
      values: toAttributesList(attributes),
    },
    attributeValueType.kvList
  );
}
