import type { IKeyValue } from '@opentelemetry/otlp-transformer';

import type { APIEvent, Meta, TransportItem } from '@grafana/faro-core';

export interface Resource {
  attributes: IKeyValue[];
}

export interface ScopeLog {
  scope: { name: string; version: string };
  logRecords: LogRecord[];
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

export interface ResourceLog {
  resource: Resource;
  scopeLogs: ScopeLog[];
}

export type LogTransportItem = TransportItem<Exclude<APIEvent, 'TraceEvent'>>;

export type LogsTransform = {
  toResourceLog: (transportItem: LogTransportItem) => {
    resource: Readonly<Resource>;
    scopeLogs: ScopeLog[];
  };
  toScopeLog: (transportItem: LogTransportItem) => ScopeLog;
  toLogRecord: (transportItem: LogTransportItem) => LogRecord;
};

export type ResourceMeta = Pick<Meta, 'app' | 'browser' | 'sdk'>;
