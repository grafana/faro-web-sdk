import type { MetaAttributes } from '@grafana/faro-core';
import type { AttributeTypes, FaroResourceAttributes } from './types';

export enum AttributeValueType {
  BOOL = 'boolValue',
  STRING = 'stringValue',
  KV_LIST = 'kvListValue',
}

export function toAttribute<T>(
  attributeName: T,
  attributeValue: any,
  attributeType: AttributeTypes = AttributeValueType.STRING
) {
  if (attributeValue == null || attributeValue === '') {
    return undefined;
  }

  return {
    key: attributeName,
    value: { [attributeType]: attributeValue },
  };
}

export function toNestedAttributes(attributeName: FaroResourceAttributes, attributes?: MetaAttributes) {
  if (!attributes || Object.keys(attributes).length === 0) {
    return;
  }

  return toAttribute(
    attributeName,
    {
      values: Object.entries(attributes).map(([attributeName, attributeValue]) =>
        toAttribute(attributeName, attributeValue)
      ),
    },
    AttributeValueType.KV_LIST
  );
}
