import type { LogEvent, TransportItem } from 'packages/web-sdk/src';
import { toAttribute } from './attributeUtils';
import { faroAttributes } from './semanticResourceAttributes';

import type { Attribute, PayloadMember } from './types';

export type LogLogRecordPayload = {
  timeUnixNano: number;
  observedTimeUnixNano: number;
  severityNumber: number;
  severityText: string;
  body: unknown;
  attributes: Attribute<any>[];
  droppedAttributesCount: number;
};

export class LogLogRecord implements PayloadMember<LogLogRecordPayload> {
  constructor(private transportItem: TransportItem<LogEvent>) {}

  getPayloadObject(): LogLogRecordPayload {
    const { meta, payload } = this.transportItem;
    const timeUnixNano = new Date(payload.timestamp).getMilliseconds() * 1e6;

    return {
      timeUnixNano,
      observedTimeUnixNano: timeUnixNano,
      severityNumber: 10,
      severityText: 'INFO2',
      body: payload.message,
      attributes: [
        toAttribute(faroAttributes.VIEW_NAME, meta.view?.name),
        toAttribute(faroAttributes.PAGE_URL, meta.page?.url),
      ].filter((item): item is Attribute<any> => Boolean(item)), // TODO: Q: will context also be converted to attributes?
      droppedAttributesCount: 0,
    };
  }
}
