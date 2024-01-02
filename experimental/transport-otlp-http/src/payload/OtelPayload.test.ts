import { EventEvent, TransportItem, TransportItemType } from '@grafana/faro-core';
import { mockInternalLogger } from '@grafana/faro-core/src/testUtils';

import { OtelPayload } from './OtelPayload';

describe('OtelPayload', () => {
  const logTransportItem: TransportItem<EventEvent> = {
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

  const traceTransportItem = {
    type: TransportItemType.TRACE,
    payload: {
      resourceSpans: [
        {
          resource: {
            attributes: [
              // Otel resource attributes left empty in this test because they are replaced by Faro Meta Attributes (these contain the Otel ones and add a few more)
            ],
            droppedAttributesCount: 0,
          },
          scopeSpans: [
            {
              scope: {
                name: '@opentelemetry/instrumentation-document-load',
                version: '0.31.0',
              },
              spans: [
                {
                  traceId: 'd6bba34860089d3a4ee58df0811b2f5f',
                  spanId: '22c85dd7b7c674e8',
                  parentSpanId: '16cff06b28240ca6',
                  name: 'resourceFetch',
                  kind: 1,
                  startTimeUnixNano: 1679329154423000000,
                  endTimeUnixNano: 1679329154449000000,
                  attributes: [
                    {
                      key: 'session_id',
                      value: {
                        stringValue: 'KBw5UzUuvF',
                      },
                    },
                    {
                      key: 'component',
                      value: {
                        stringValue: 'document-load',
                      },
                    },
                    {
                      key: 'http.url',
                      value: {
                        stringValue:
                          'http://localhost:5173/@fs/Users/marcoschaefer/Code/faro-web-sdk/packages/web-sdk/dist/esm/transports/otlp/index.js?t=1679329135042',
                      },
                    },
                    {
                      key: 'http.response_content_length',
                      value: {
                        intValue: 671,
                      },
                    },
                  ],
                  droppedAttributesCount: 0,
                  events: [
                    {
                      attributes: [],
                      name: 'test-event',
                      timeUnixNano: 1679329154423000000,
                      droppedAttributesCount: 0,
                    },
                  ],
                  droppedEventsCount: 0,
                  status: {
                    code: 0,
                  },
                  links: [],
                  droppedLinksCount: 0,
                },
              ],
            },
          ],
        },
      ],
    },
    meta: {
      browser: {
        name: 'browser-name',
        version: 'browser-v109.0',
        //…
      },
    },
  };

  it('Creates an instance with empty OtelPayload', () => {
    const otelPayload = new OtelPayload({ internalLogger: mockInternalLogger });
    const payload = otelPayload.getPayload();

    expect(payload.resourceLogs).toHaveLength(0);
  });

  it('Creates an instance containing the correct resourceLog for the given TransportItem', () => {
    const otelPayload = new OtelPayload({ internalLogger: mockInternalLogger, transportItem: logTransportItem });
    const payload = otelPayload.getPayload();

    expect(payload.resourceLogs).toHaveLength(1);
    expect(payload.resourceLogs?.[0]).toMatchObject({
      resource: { attributes: [] },
      scopeLogs: [{ logRecords: [resourceLog] }],
    });
  });

  it('Add adds a new LogRecord to existing logRecords array because they have the same meta and same scope', () => {
    const transportItem = {
      ...logTransportItem,
      meta: { browser: { name: 'Firefox' } },
    };

    const otelPayload = new OtelPayload({ internalLogger: mockInternalLogger, transportItem });

    otelPayload.addResourceItem({
      ...transportItem,
      meta: {
        ...transportItem.meta,
        // Page meta is NOT used to create the Resource object.
        // This is to ensure that we do only diff Resource related metas when defining if item belongs to a Resource we've already created.
        page: {
          id: '123',
        },
      },
      payload: {
        ...transportItem.payload,
        name: 'event-name-2',
      },
    });

    const payload = otelPayload.getPayload();
    expect(payload.resourceLogs).toHaveLength(1);
    expect(payload.resourceLogs?.[0]?.scopeLogs[0]?.logRecords).toHaveLength(2);
  });

  it('Adds a new ResourceSpan', () => {
    const otelPayload = new OtelPayload({ internalLogger: mockInternalLogger, transportItem: traceTransportItem });
    const payload = otelPayload.getPayload();

    expect(payload.resourceLogs).toHaveLength(0);
    expect(payload.resourceSpans).toHaveLength(1);
    expect(payload.resourceSpans?.[0]).toMatchObject({
      resource: {
        attributes: [
          {
            key: 'browser.name',
            value: { stringValue: 'browser-name' },
          },
          {
            key: 'browser.version',
            value: { stringValue: 'browser-v109.0' },
          },
        ],
      }, // empty array because Trace TransportItem doesn't contain any Metas and we drop resources set by Otel and use the Faro Metas instead to derive the resource!
      scopeSpans: traceTransportItem.payload.resourceSpans[0]?.scopeSpans,
    });
  });
});
