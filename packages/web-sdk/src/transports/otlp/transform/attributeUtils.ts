import { isArray, isBoolean, isInt, isNumber, isObject, isString } from '@grafana/faro-core';

export enum AttributeValueType {
  BOOL = 'boolValue',
  STRING = 'stringValue',
  KV_LIST = 'kvListValue',
}

function toAttributeValue(value: unknown): any {
  if (isArray(value)) {
    return { arrayValue: value.map(toAttributeValue) };
  }

  if (isString(value)) {
    return { stringValue: value };
  }

  if (isBoolean(value)) {
    return { boolValue: value };
  }

  if (isNumber(value)) {
    return { doubleValue: value as number };
  }

  if (isInt(value)) {
    return { intValue: value };
  }

  if (isObject(value)) {
    return {
      kvlistValue: {
        values: Object.entries(value).map(([attributeName, attributeValue]) =>
          toAttribute(attributeName, attributeValue)
        ),
      },
    };
  }

  return { x: 'hallo' };
}

export function toAttribute<T>(attributeName: T, attributeValue: any): any {
  if (attributeValue == null || attributeValue === '') {
    return undefined;
  }

  return {
    key: attributeName,
    value: toAttributeValue(attributeValue),
  } as const;
}

// // TODO: maybe rename toKvListValue
// export function toNestedAttributes(attributeName: string, attributes?: MetaAttributes) {
//   if (!attributes || Object.keys(attributes).length === 0) {
//     return;
//   }

//   return toAttribute(attributeName, {
//     values: Object.entries(attributes).map(([attributeName, attributeValue]) =>
//       toAttribute(attributeName, attributeValue)
//     ),
//   });
// }
