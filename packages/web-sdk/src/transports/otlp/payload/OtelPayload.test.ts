import { EventEvent, TransportItem, TransportItemType } from '@grafana/faro-core';

import { OtelPayload } from './OtelPayload';

describe('OtelPayload', () => {
  const logItem: TransportItem<EventEvent> = {
    type: TransportItemType.EVENT,
    payload: {
      name: 'event-name',
      domain: 'event-domain',
      timestamp: '2023-01-27T09:53:01.035Z',
      attributes: {
        eventAttribute1: 'one',
        eventAttribute2: 'two',
      },
    },
    meta: {},
  };

  const resourceLog = {
    timeUnixNano: 1674813181035000000,

    attributes: [
      {
        key: 'event.name',
        value: { stringValue: 'event-name' },
      },
      {
        key: 'event.domain',
        value: { stringValue: 'event-domain' },
      },
      {
        key: 'event.attributes',
        value: {
          kvlistValue: {
            values: [
              {
                key: 'eventAttribute1',
                value: {
                  stringValue: 'one',
                },
              },
              {
                key: 'eventAttribute2',
                value: {
                  stringValue: 'two',
                },
              },
            ],
          },
        },
      },
    ],
  };

  it('Creates an instance with empty OtelPayload', () => {
    const otelPayload = new OtelPayload();
    const payload = otelPayload.getPayload();

    expect(payload.resourceLogs.length).toBe(0);
    expect(payload.resourceSpans.length).toBe(0);
  });

  it('Creates an instance containing the correct resourceLog for the given TransportItem', () => {
    const otelPayload = new OtelPayload(logItem);
    const payload = otelPayload.getPayload();

    expect(payload.resourceLogs.length).toBe(1);
    expect(payload.resourceLogs[0]).toMatchObject({
      resource: { attributes: [] },
      scopeLogs: [{ logRecords: [resourceLog] }],
    });
    expect(payload.resourceSpans.length).toBe(0);
  });

  it('Add adds a new ScopeLog to existing resource log because they have the same meta', () => {
    const transportItem = {
      ...logItem,
      meta: { browser: { name: 'Firefox' } },
    };

    const otelPayload = new OtelPayload(transportItem);

    otelPayload.addResourceItem({
      ...transportItem,
      payload: {
        ...transportItem.payload,
        name: 'event-name-2',
      },
    });

    const payload = otelPayload.getPayload();
    expect(payload.resourceLogs.length).toBe(1);
    expect(payload.resourceLogs[0]?.scopeLogs.length).toBe(2);
  });

  it('Add creates a new ResourceLog because they have different metas', () => {
    const otelPayload = new OtelPayload({
      ...logItem,
      meta: { browser: { name: 'Firefox' } },
    });

    otelPayload.addResourceItem({
      ...logItem,
      meta: { browser: { name: 'Chrome' } },
    });

    const payload = otelPayload.getPayload();
    expect(payload.resourceLogs.length).toBe(2);
    expect(payload.resourceLogs[0]?.resource).not.toMatchObject(payload.resourceLogs[1]?.resource ?? {});
  });
});
