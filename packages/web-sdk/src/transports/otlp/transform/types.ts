import type { APIEvent } from 'packages/core/src/api';
import type { TransportItem } from 'packages/core/src/transports';
import type { Attribute } from './attributes';

export interface ResourcePayload {
  attributes: Attribute[];
}

export interface ScopeLog {
  scope: { name: string; version: string };
  logRecords: (unknown | undefined)[]; // TODO add correct type
}

export interface LogLogRecordPayload {
  timeUnixNano: number;
  severityNumber: number;
  severityText: string;
  body: { stringValue: string };
  attributes: Attribute[];
  traceId: string | undefined;
  spanId: string | undefined;
}

export interface EventLogRecordPayload {
  timeUnixNano: number;
  body: { stringValue: string };
  attributes: Attribute[];
  traceId: string | undefined;
  spanId: string | undefined;
}

export interface ErrorLogRecordPayload {
  readonly timeUnixNano: number;
  readonly attributes: Attribute[];
  readonly traceId: string | undefined;
  readonly spanId: string | undefined;
}

export interface ResourceLogPayload {
  resource: ResourcePayload;
  scopeLogs: ScopeLog[];
}

export type LogTransportItem = TransportItem<Exclude<APIEvent, 'TraceEvent'>>;
