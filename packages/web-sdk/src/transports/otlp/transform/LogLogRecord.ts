import type { EventEvent, ExceptionEvent, LogEvent, TransportItemPayload } from 'packages/web-sdk/src';

import type { Attribute, LogTransportItem, PayloadMember } from './types';

// console.log - 10 / INFO2 -> this is a special case
// console.trace - 1 / TRACE
// console.debug - 5 / DEBUG
// console.info - 9 / INFO
// console.warn - 13 / WARN
// console.error - 17 / ERROR

export type LogLogRecordPayload = {
  timeUnixNano: number;
  observedTimeUnixNano: number;
  severityNumber: number;
  severityText: string;
  body: Attribute<string>;
  attributes: unknown[];
  droppedAttributesCount: 0;
  traceId?: string;
  spanId?: string;
};

type TimestampedEvent = LogEvent | ExceptionEvent | EventEvent;
export class LogLogRecord implements PayloadMember<LogLogRecordPayload> {
  constructor(private transportItem: LogTransportItem) {}

  getPayloadObject(): LogLogRecordPayload {
    const { type, payload } = this.transportItem;

    return {
      timeUnixNano: payload,
    } as LogLogRecordPayload;
  }
}
