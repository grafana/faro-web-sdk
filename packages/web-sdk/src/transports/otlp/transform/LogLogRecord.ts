import type { LogEvent, TransportItem } from '@grafana/faro-core';

import { attributeValueType, toAttribute } from './attributeUtils';
import { sematicAttributes } from './semanticResourceAttributes';

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
    const timeUnixNano = Date.parse(payload.timestamp) * 1e6;

    return {
      timeUnixNano,
      observedTimeUnixNano: timeUnixNano,
      severityNumber: 10,
      severityText: 'INFO2',
      body: { [attributeValueType.string]: payload.message },
      attributes: [
        toAttribute(sematicAttributes.FARO_LOG, true, attributeValueType.bool),
        toAttribute(sematicAttributes.VIEW_NAME, meta.view?.name),
        toAttribute(sematicAttributes.PAGE_URL, meta.page?.url),
        // TODO: Q: shall we also add the pageId?
      ].filter((item): item is Attribute<any> => Boolean(item)), // TODO: Q: will context also be converted to attributes?
      droppedAttributesCount: 0,
    };
  }
}
