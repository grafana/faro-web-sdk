import type { EventEvent } from 'packages/core/src/api';
import type { TransportItem } from 'packages/core/src/transports';
import type { Attribute, PayloadMember } from './types';

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
  constructor(private transportItem: TransportItem<EventEvent>) {}
  getPayloadObject(): EventLogRecordPayload {
    throw new Error('Method not implemented.');
  }
}
