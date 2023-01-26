import type { Attribute, LogTransportItem, PayloadMember } from './types';

export type ErrorLogRecordPayload = {
  timeUnixNano: number;
  observedTimeUnixNano: number;
  severityNumber: number;
  severityText: string;
  body: Attribute<string>;
  attributes: unknown[];
  droppedAttributesCount: 0;
  // traceId: string;
  // spanId: string;
};

export class ErrorLogRecord implements PayloadMember<ErrorLogRecordPayload> {
  constructor(private transportItem: LogTransportItem) {}
  getPayloadObject(): ErrorLogRecordPayload {
    throw new Error('Method not implemented.');
  }
}
