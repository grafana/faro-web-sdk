import type { faroResourceAttributes } from './semanticResourceAttributes';
import type { Resource } from './Resource';
import type { attributeValueType } from './attributeUtils';
import type { TransportItem } from 'packages/core/src/transports';
import type { APIEvent } from 'packages/core/src/api';

export interface PayloadMember<T> {
  getPayloadObject(): T;
}

export type FaroResourceAttributes = typeof faroResourceAttributes[keyof typeof faroResourceAttributes];

export type ResourceLogs = {
  resource: Resource;
  scopeLogs: unknown[]; // TODO: add correct type once defined
};

export type Attribute<T> = {
  key: T;
  value: { [key: string]: any };
};

export type AttributeTypes = typeof attributeValueType[keyof typeof attributeValueType];

export type LogTransportItem = TransportItem<Exclude<APIEvent, 'TraceEvent'>>;
