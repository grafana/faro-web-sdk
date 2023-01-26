import type { APIEvent, TransportItem } from 'packages/web-sdk/src';

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
  constructor(private transportItem: TransportItem<Exclude<APIEvent, 'TraceEvent'>>) {}

  getPayloadObject(): LogRecordPayload {
    return {} as LogRecordPayload;
  }
}
