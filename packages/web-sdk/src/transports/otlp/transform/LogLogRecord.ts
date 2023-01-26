import type { LogEvent, TransportItem } from 'packages/web-sdk/src';

import type { PayloadMember } from './types';

export type LogLogRecordPayload = {
  timeUnixNano: number;
  observedTimeUnixNano: number;
  severityNumber: number;
  severityText: string;
  body: unknown;
  attributes: unknown[];
  droppedAttributesCount: number;
};

export class LogLogRecord implements PayloadMember<LogLogRecordPayload> {
  constructor(private transportItem: TransportItem<LogEvent>) {}

  getPayloadObject(): LogLogRecordPayload {
    const { payload } = this.transportItem;
    const timeUnixNano = new Date(payload.timestamp).getMilliseconds() * 1e6;

    return {
      timeUnixNano,
      observedTimeUnixNano: timeUnixNano,
      severityNumber: 10,
      severityText: 'INFO2',
      body: payload.message,
      attributes: [], // TODO: will context be converted to attributes?
      droppedAttributesCount: 0,
    };
  }
}
