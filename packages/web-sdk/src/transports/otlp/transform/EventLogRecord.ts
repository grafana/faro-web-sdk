import type { EventEvent } from 'packages/core/src/api';
import type { TransportItem } from 'packages/core/src/transports';
import { attributeValueType, toAttribute, toNestedAttributes } from './attributeUtils';
import { sematicAttributes } from './semanticResourceAttributes';
import type { Attribute, PayloadMember } from './types';

export type EventLogRecordPayload = {
  timeUnixNano: number;
  observedTimeUnixNano: number;
  severityNumber: number;
  severityText: string;
  body: unknown;
  attributes: unknown[];
  droppedAttributesCount: 0;
  traceId: string | undefined;
  spanId: string | undefined;
};

export class EventLogRecord implements PayloadMember<EventLogRecordPayload> {
  constructor(private transportItem: TransportItem<EventEvent>) {}
  getPayloadObject(): EventLogRecordPayload {
    const { meta, payload } = this.transportItem;
    const timeUnixNano = Date.parse(payload.timestamp) * 1e6;

    return {
      timeUnixNano,
      observedTimeUnixNano: timeUnixNano,
      severityNumber: 1,
      severityText: 'TRACE',
      body: { [attributeValueType.string]: payload.name },
      attributes: [
        toAttribute(sematicAttributes.FARO_EVENT, true, attributeValueType.bool),
        toAttribute(sematicAttributes.EVENT_NAME, payload.name),
        toAttribute(sematicAttributes.EVENT_DOMAIN, payload.domain),
        toNestedAttributes('event.attributes', payload.attributes),
        toAttribute(sematicAttributes.VIEW_NAME, meta.view?.name),
        toAttribute(sematicAttributes.PAGE_URL, meta.page?.url),
      ].filter((item): item is Attribute<any> => Boolean(item)), // TODO: Q: will context also be converted to attributes?
      droppedAttributesCount: 0,
      traceId: payload.trace?.trace_id,
      spanId: payload.trace?.trace_id,
    };
  }
}
