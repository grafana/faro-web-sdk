import type { APIEvent, TransportItem } from '@grafana/faro-core';

import type { Attribute } from '../attribute';

export interface ResourcePayload {
  attributes: Attribute[];
}

export interface ScopeLog {
  scope: { name: string; version: string };
  logRecords: LogRecordPayload[];
}

export type LogRecordPayload =
  | LogLogRecordPayload
  | EventLogRecordPayload
  | ErrorLogRecordPayload
  | MeasurementLogRecord
  | ResourceLogPayload;

export interface LogLogRecordPayload {
  timeUnixNano: number;
  severityNumber: number;
  severityText: string;
  body: { stringValue: string };
  attributes: Attribute[];
  traceId?: string;
  spanId?: string;
}

export interface EventLogRecordPayload {
  timeUnixNano: number;
  body: { stringValue: string };
  attributes: Attribute[];
  traceId?: string;
  spanId?: string;
}

export interface ErrorLogRecordPayload {
  readonly timeUnixNano: number;
  readonly attributes: Attribute[];
  readonly traceId?: string;
  readonly spanId?: string;
}

export interface MeasurementLogRecord {
  readonly attributes: Attribute[];
  readonly traceId?: string;
  readonly spanId?: string;
}

export interface ResourceLogPayload {
  resource: ResourcePayload;
  scopeLogs: ScopeLog[];
}

export type LogTransportItem = TransportItem<Exclude<APIEvent, 'TraceEvent'>>;
