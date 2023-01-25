import type { faroResourceAttributes } from './semanticResourceAttributes';
import type { Resource } from './Resource';
import type { attributeValueType } from './attributeUtils';

export interface PayloadResourceChild<T> {
  getPayloadObject(): T;
}

export type FaroResourceAttributes = typeof faroResourceAttributes[keyof typeof faroResourceAttributes];

export type ResourceLogs = {
  resource: Resource;
  scopeLogs: unknown[];
};

export type Attribute<T> = {
  key: T;
  value: { [key: string]: unknown };
};

export type AttributeTypes = typeof attributeValueType[keyof typeof attributeValueType];
