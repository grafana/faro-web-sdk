import type { MeasurementEvent } from 'packages/core/src/api';
import type { TransportItem } from 'packages/core/src/transports';

import type { Attribute, PayloadMember } from './types';

// console.log - 10 / INFO2 -> this is a special case
// console.trace - 1 / TRACE
// console.debug - 5 / DEBUG
// console.info - 9 / INFO
// console.warn - 13 / WARN
// console.error - 17 / ERROR

export type MeasurementLogRecordPayload = {
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

export class MeasurementLogRecord implements PayloadMember<MeasurementLogRecordPayload> {
  constructor(private transportItem: TransportItem<MeasurementEvent>) {}

  getPayloadObject(): MeasurementLogRecordPayload {
    return {} as MeasurementLogRecordPayload;
  }
}
