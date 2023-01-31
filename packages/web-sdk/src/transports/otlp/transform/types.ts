import type { faroResourceAttributes } from './semanticResourceAttributes';

import type { AttributeValueType } from './attributeUtils';
import type { TransportItem } from 'packages/core/src/transports';
import type { APIEvent } from 'packages/core/src/api';

export type FaroResourceAttributes = typeof faroResourceAttributes[keyof typeof faroResourceAttributes];

export interface ResourcePayload {
  attributes: Attribute<string>[];
  droppedAttributesCount: number;
}

export interface ScopeLog {
  scope: { name: string; version: string };
  logRecords: (unknown | undefined)[]; // TODO add correct type
}

export interface LogLogRecordPayload {
  timeUnixNano: number;
  observedTimeUnixNano: number;
  severityNumber: number;
  severityText: string;
  body: { stringValue: string };
  attributes: Attribute<any>[]; // TODO: Q: will context also be converted to attributes?
  droppedAttributesCount: number;
  traceId: string | undefined;
  spanId: string | undefined;
}

export interface EventLogRecordPayload {
  timeUnixNano: number;
  observedTimeUnixNano: number;
  severityNumber: number;
  severityText: string;
  body: { stringValue: string };
  attributes: Attribute<any>[]; // TODO: Q: will context also be converted to attributes?
  droppedAttributesCount: number;
  traceId: string | undefined;
  spanId: string | undefined;
}

export interface ResourceLogPayload {
  resource: ResourcePayload;
  scopeLogs: ScopeLog[];
}

export interface Attribute<T> {
  key: T;
  value: { [key: string]: any };
}

export type AttributeTypes = typeof AttributeValueType[keyof typeof AttributeValueType];

export type LogTransportItem = TransportItem<Exclude<APIEvent, 'TraceEvent'>>;
