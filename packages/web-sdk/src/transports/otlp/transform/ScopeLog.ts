import type { LogRecord, LogRecordPayload } from './LogRecord';
import type { PayloadMember } from './types';

type ScopePayload = {
  name: string;
  version: string;
};

type ScopeLogPayload = {
  scope: ScopePayload;
  logRecords: LogRecordPayload[];
};

export class ScopeLog implements PayloadMember<ScopeLogPayload> {
  private logRecords: LogRecord[] = [];
  constructor(private scope: ScopePayload, logRecord: LogRecord) {
    this.logRecords.push(logRecord);
  }

  getPayloadObject(): ScopeLogPayload {
    return {
      scope: this.scope,
      logRecords: this.logRecords.map((logRecord) => {
        return logRecord.getPayloadObject();
      }),
    };
  }
}
