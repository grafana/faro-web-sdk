import type { ErrorLogRecordPayload } from './ErrorLogRecord';
import type { EventLogRecordPayload } from './EventLogRecord';
import type { LogLogRecordPayload } from './LogLogRecord';
import type { LogRecord } from './LogRecordFactory';
import type { MeasurementLogRecordPayload } from './MeasurementLogRecord';
import type { Scope, ScopePayload } from './Scope';
import type { PayloadMember } from './types';

export type ScopeLogPayload = {
  scope: ScopePayload;
  logRecords: (LogLogRecordPayload | ErrorLogRecordPayload | EventLogRecordPayload | MeasurementLogRecordPayload)[];
};

export class ScopeLog implements PayloadMember<ScopeLogPayload> {
  private logRecords: LogRecord[] = [];

  constructor(private scope: Scope, logRecord: LogRecord) {
    this.logRecords.push(logRecord);
  }

  getScope(): Scope {
    return this.scope;
  }

  addLogRecord(logRecord: LogRecord) {
    this.logRecords.push(logRecord);
  }

  getPayloadObject(): ScopeLogPayload {
    return {
      scope: this.scope.getPayloadObject(),
      logRecords: this.logRecords.map((logRecord) => logRecord.getPayloadObject()),
    } as const;
  }
}
