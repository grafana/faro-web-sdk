import type { Attribute, LogTransportItem, PayloadMember } from './types';

export type EventLogRecordPayload = {
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

export class EventLogRecord implements PayloadMember<EventLogRecordPayload> {
  constructor(private transportItem: LogTransportItem) {}
  getPayloadObject(): EventLogRecordPayload {
    throw new Error('Method not implemented.');
  }
}
