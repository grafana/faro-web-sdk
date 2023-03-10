import type { IKeyValue, IResource, IResourceSpans } from '@opentelemetry/otlp-transformer';

import type { APIEvent, Meta, TraceEvent, TransportItem } from '@grafana/faro-core';

export interface Resource extends Partial<Pick<IResource, 'droppedAttributesCount'>> {
  attributes: IKeyValue[];
}

export interface LogRecord {
  timeUnixNano?: number;
  severityNumber?: number;
  severityText?: string;
  body?: { stringValue: string };
  attributes?: IKeyValue[];
  traceId?: string;
  spanId?: string;
}
export interface ScopeLog {
  scope: { name: string; version: string };
  logRecords: LogRecord[];
}

export interface ScopeSpan {
  scope: { name: string; version: string };
  logRecords: LogRecord[];
}

export interface ResourceLogs {
  resource: Resource;
  scopeLogs: ScopeLog[];
}

export interface ResourceSpans extends Omit<IResourceSpans, 'resource'> {
  resource: Resource;
}

export type LogTransportItem = TransportItem<Exclude<APIEvent, 'TraceEvent'>>;
export type TraceTransportItem = TransportItem<TraceEvent>;

export type LogsTransform = {
  toResourceLog: (transportItem: LogTransportItem) => ResourceLogs;
  toScopeLog: (transportItem: LogTransportItem) => ScopeLog;
  toLogRecord: (transportItem: LogTransportItem) => LogRecord;
};

export type TraceTransform = {
  toResourceSpan: (transportItem: TransportItem<TraceEvent>) => ResourceSpans;
};

export type ResourceMeta = Pick<Meta, 'app' | 'browser' | 'sdk'>;
