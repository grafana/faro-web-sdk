import type { LogEvent, TransportItem } from 'packages/core/dist/types';
import type { ExceptionEvent } from 'packages/core/src/api';
import type { Attribute, PayloadMember } from './types';

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
  constructor(private transportItem: TransportItem<ExceptionEvent>) {}
  getPayloadObject(): ErrorLogRecordPayload {
    throw new Error('Method not implemented.');
  }
}
