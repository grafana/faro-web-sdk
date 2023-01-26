import type { LogRecord, LogRecordPayload } from './LogRecord';
import type { Scope, ScopePayload } from './Scope';
import type { PayloadMember } from './types';

export type ScopeLogPayload = {
  scope: ScopePayload;
  logRecords: LogRecordPayload[];
};

export class ScopeLog implements PayloadMember<ScopeLogPayload> {
  private logRecords: LogRecord[] = [];

  constructor(private scope: Scope, logRecord: LogRecord) {
    this.logRecords.push(logRecord);
  }

  getPayloadObject(): ScopeLogPayload {
    return {
      scope: this.scope.getPayloadObject(),
      logRecords: this.logRecords.map((logRecord) => logRecord.getPayloadObject()),
    } as const;
  }
}
