import type {
  IKeyValue,
  Resource as OtelResource,
} from '@opentelemetry/otlp-transformer/build/src/common/internal-types';
import type { IResourceSpans } from '@opentelemetry/otlp-transformer/build/src/trace/internal-types';

import type { APIEvent, Meta, TraceEvent, TransportItem } from '@grafana/faro-core';

export interface Resource extends Partial<Pick<OtelResource, 'droppedAttributesCount'>> {
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

export type Scope = {
  name: string;
  version: string;
};

export interface ScopeLog {
  scope: Scope;
  logRecords: LogRecord[];
}

export interface ScopeSpan {
  scope: Scope;
  logRecords: LogRecord[];
}

export interface ResourceLog {
  resource: Resource;
  scopeLogs: ScopeLog[];
}

export type ResourceLogs = ResourceLog[];

export interface ResourceSpan extends Omit<IResourceSpans, 'resource'> {
  resource: Resource;
}

export type ResourceSpans = ResourceSpan[];

export type LogTransportItem = TransportItem<Exclude<APIEvent, 'TraceEvent'>>;
export type TraceTransportItem = TransportItem<TraceEvent>;

export type LogsTransform = {
  toResourceLog: (transportItem: LogTransportItem) => ResourceLog;
  toScopeLog: (transportItem: LogTransportItem) => ScopeLog;
  toLogRecord: (transportItem: LogTransportItem) => LogRecord;
};

export type TraceTransform = {
  toResourceSpan: (transportItem: TransportItem<TraceEvent>) => ResourceSpan;
};

export type ResourceMeta = Pick<Meta, 'app' | 'browser' | 'sdk'>;

export type StringValueNonNullable = { stringValue: string };
