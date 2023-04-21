import type { IAnyValue, IKeyValue } from '@opentelemetry/otlp-transformer';

import { isArray, isBoolean, isInt, isNumber, isObject, isString } from '@grafana/faro-core';

export function toAttributeValue(value: unknown): IAnyValue {
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

  if (value instanceof Uint8Array) {
    return { bytesValue: value };
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

export function toAttribute(attributeName: string, attributeValue: any): IKeyValue | undefined {
  if (attributeValue == null || attributeValue === '') {
    return undefined;
  }

  return {
    key: attributeName,
    value: toAttributeValue(attributeValue),
  };
}

export function isAttribute(item: any): item is IKeyValue {
  return Boolean(item) && typeof item?.key === 'string' && typeof item?.value !== 'undefined';
}
