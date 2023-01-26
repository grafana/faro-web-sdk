import type { Attribute, PayloadMember } from './types';

export type LogRecordPayload = {
  timeUnixNano: number;
  observedTimeUnixNano: number;
  severityNumber: 1;
  severityText: 'TRACE';
  body: Attribute<string>;
  attributes: unknown[];
  droppedAttributesCount: 0;
  traceId: string;
  spanId: string;
};

export class LogRecord implements PayloadMember<LogRecordPayload> {
  constructor() {}
  getPayloadObject(): LogRecordPayload {
    return {} as LogRecordPayload;
  }
}
