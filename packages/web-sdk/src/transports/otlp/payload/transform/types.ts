import type { IKeyValue } from '@opentelemetry/otlp-transformer';

import type { APIEvent, TransportItem } from '@grafana/faro-core';

export interface ResourcePayload {
  attributes: IKeyValue[];
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
  attributes: IKeyValue[];
  traceId?: string;
  spanId?: string;
}

export interface EventLogRecordPayload {
  timeUnixNano: number;
  body: { stringValue: string };
  attributes: IKeyValue[];
  traceId?: string;
  spanId?: string;
}

export interface ErrorLogRecordPayload {
  readonly timeUnixNano: number;
  readonly attributes: IKeyValue[];
  readonly traceId?: string;
  readonly spanId?: string;
}

export interface MeasurementLogRecord {
  readonly attributes: IKeyValue[];
  readonly traceId?: string;
  readonly spanId?: string;
}

export interface ResourceLogPayload {
  resource: ResourcePayload;
  scopeLogs: ScopeLog[];
}

export type LogTransportItem = TransportItem<Exclude<APIEvent, 'TraceEvent'>>;
