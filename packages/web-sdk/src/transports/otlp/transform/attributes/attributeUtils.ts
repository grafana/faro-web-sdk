import { isArray, isBoolean, isInt, isNumber, isObject, isString } from '@grafana/faro-core';
import type { Attribute, AttributeValue } from './types';

export function toAttributeValue(value: unknown): AttributeValue {
  if (isString(value)) {
    return { stringValue: value };
  }

  if (isInt(value)) {
    return { intValue: value };
  }

  if (isNumber(value)) {
    return { doubleValue: value as number };
  }

  if (isBoolean(value)) {
    return { boolValue: value };
  }

  if (isArray(value)) {
    return { arrayValue: { values: value.map(toAttributeValue) } };
  }

  if (isObject(value)) {
    return {
      kvlistValue: {
        values: Object.entries(value)
          .map(([attributeName, attributeValue]) => toAttribute(attributeName, attributeValue))
          .filter(isAttribute),
      },
    };
  }

  return {};
}

export function toAttribute(attributeName: string, attributeValue: any): Attribute | undefined {
  if (attributeValue == null || attributeValue === '') {
    return undefined;
  }

  return {
    key: attributeName,
    value: toAttributeValue(attributeValue),
  };
}

export function isAttribute(item: any): item is Attribute {
  return Boolean(item) && typeof item?.key === 'string' && typeof item?.value !== 'undefined';
}
