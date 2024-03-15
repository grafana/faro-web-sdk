import { initializeFaro } from '@grafana/faro-core';
import { mockConfig } from '@grafana/faro-core/src/testUtils';

import { sendFaroEvents } from './faroTraceExporter.utils';

describe('faroTraceExporter.utils', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('Emits no faro events if no client spans are contained ', () => {
    const faro = initializeFaro(mockConfig());

    const mockPushEvent = jest.fn();
    jest.spyOn(faro.api, 'pushEvent').mockImplementationOnce(mockPushEvent);

    // remove scopeSpan which contains client span
    const data = {
      ...testData[0],
      scopeSpans: testData[0]?.scopeSpans.map((s) => ({ ...s })),
    };

    data.scopeSpans!.pop();

    sendFaroEvents([data as any]);

    expect(mockPushEvent).toBeCalledTimes(0);
  });

  it('Creates a Faro event for client spans only', () => {
    const faro = initializeFaro(mockConfig());

    const mockPushEvent = jest.fn();
    jest.spyOn(faro.api, 'pushEvent').mockImplementationOnce(mockPushEvent);

    sendFaroEvents(testData);

    expect(mockPushEvent).toBeCalledTimes(1);
    expect(mockPushEvent.mock.lastCall[0]).toBe('faro.tracing.fetch');
    expect(mockPushEvent.mock.lastCall[1]).toStrictEqual({
      component: 'fetch',
      session_id: 'my-session-id',
      'http.host': 'my-host',
      'http.method': 'GET',
      'http.response_content_length': '127',
      'http.scheme': 'http',
      'http.status_code': '401',
      'http.status_text': 'Unauthorized',
      'http.url': 'http://foo/bar',
      'http.user_agent': 'my-user-agent',
    });
  });

  it('Uses whole instrumentation name if no "-" is part of the name', () => {
    const faro = initializeFaro(mockConfig());

    const mockPushEvent = jest.fn();
    jest.spyOn(faro.api, 'pushEvent').mockImplementationOnce(mockPushEvent);

    // add scope name without "-"
    const data = {
      ...testData[0],
      scopeSpans: testData[0]?.scopeSpans.map((s) => ({ ...s })),
    };
    data.scopeSpans!.at(-1)!.scope.name = '@foo/coolName';

    sendFaroEvents([data as any]);

    expect(mockPushEvent).toBeCalledTimes(1);
    expect(mockPushEvent.mock.lastCall[0]).toBe('faro.tracing.coolName');
  });

  it('Call Faro event API with traceID and spanID of contained in teh span', () => {
    const faro = initializeFaro(mockConfig());

    const mockPushEvent = jest.fn();
    jest.spyOn(faro.api, 'pushEvent').mockImplementationOnce(mockPushEvent);

    // add scope name without "-"
    const data = {
      ...testData[0],
      scopeSpans: testData[0]?.scopeSpans.map((s) => ({ ...s })),
    };
    data.scopeSpans!.at(-1)!.scope.name = '@foo/coolName';

    sendFaroEvents([data as any]);

    expect(mockPushEvent).toBeCalledTimes(1);
    expect(mockPushEvent.mock.lastCall[3]).toStrictEqual({
      spanContext: {
        spanId: '4c47d5f85e4b2aec',
        traceId: '7fb8581e3db5ebc6be4e36a7a8817cfe',
      },
    });
  });
});

// some unnecessary parts are removed to shorten the object a bit.
const testData = [
  {
    resource: {
      attributes: [],
      droppedAttributesCount: 0,
    },
    scopeSpans: [
      {
        scope: {
          name: '@opentelemetry/instrumentation-document-load',
          version: '0.35.0',
        },
        spans: [
          {
            traceId: 'b3eb030d2a6a3ea28fd81a2c3c865d32',
            spanId: '146cbe6578eedc77',
            parentSpanId: '411fbeb357bad860',
            name: 'resourceFetch',
            kind: 1,
            startTimeUnixNano: '1709051097380000000',
            endTimeUnixNano: '1709051097419000000',
            attributes: [
              {
                key: 'session_id',
                value: {
                  stringValue: '7Zk2kA92sT',
                },
              },
              {
                key: 'http.url',
                value: {
                  stringValue:
                    'http://localhost:5173/@fs/Users/marcoschaefer/Code/Repos/Grafana/faro-web-sdk/packages/core/dist/esm/api/traces/index.js',
                },
              },
              {
                key: 'http.response_content_length',
                value: {
                  intValue: 652,
                },
              },
            ],
            droppedAttributesCount: 0,
            events: [
              {
                attributes: [],
                name: 'fetchStart',
                timeUnixNano: '1709051097380000000',
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
      {
        scope: {
          name: '@grafana/faro-react',
          version: '1.3.9',
        },
        spans: [
          {
            traceId: 'e2e8ca244a7f149ca0f8e820df2d2ec1',
            spanId: 'f4e18e624b397865',
            name: 'componentMount',
            kind: 1,
            startTimeUnixNano: '1709051097617000000',
            endTimeUnixNano: '1709051097617000000',
            attributes: [
              {
                key: 'session_id',
                value: {
                  stringValue: '7Zk2kA92sT',
                },
              },
              {
                key: 'react.component.name',
                value: {
                  stringValue: 'CounterComponent',
                },
              },
            ],
            droppedAttributesCount: 0,
            events: [],
            droppedEventsCount: 0,
            status: {
              code: 0,
            },
            links: [],
            droppedLinksCount: 0,
          },
        ],
      },
      {
        scope: {
          name: '@opentelemetry/instrumentation-fetch',
          version: '0.45.1',
        },
        spans: [
          {
            // this is the only span which is of kind=3 (client)
            traceId: '7fb8581e3db5ebc6be4e36a7a8817cfe',
            spanId: '4c47d5f85e4b2aec',
            parentSpanId: 'da5a27b83e0f2871',
            name: 'HTTP GET',
            kind: 3,
            startTimeUnixNano: '1709051097594000000',
            endTimeUnixNano: '1709051097609000000',
            attributes: [
              {
                key: 'session_id',
                value: {
                  stringValue: 'my-session-id',
                },
              },
              {
                key: 'component',
                value: {
                  stringValue: 'fetch',
                },
              },
              {
                key: 'http.method',
                value: {
                  stringValue: 'GET',
                },
              },
              {
                key: 'http.url',
                value: {
                  stringValue: 'http://foo/bar',
                },
              },
              {
                key: 'http.status_code',
                value: {
                  intValue: 401,
                },
              },
              {
                key: 'http.status_text',
                value: {
                  stringValue: 'Unauthorized',
                },
              },
              {
                key: 'http.host',
                value: {
                  stringValue: 'my-host',
                },
              },
              {
                key: 'http.scheme',
                value: {
                  stringValue: 'http',
                },
              },
              {
                key: 'http.user_agent',
                value: {
                  stringValue: 'my-user-agent',
                },
              },
              {
                key: 'http.response_content_length',
                value: {
                  intValue: 127,
                },
              },
            ],
            droppedAttributesCount: 0,
            events: [
              {
                attributes: [],
                name: 'fetchStart',
                timeUnixNano: '1709051097594000000',
                droppedAttributesCount: 0,
              },
              {
                attributes: [],
                name: 'domainLookupStart',
                timeUnixNano: '1709051097594000000',
                droppedAttributesCount: 0,
              },
              {
                attributes: [],
                name: 'domainLookupEnd',
                timeUnixNano: '1709051097594000000',
                droppedAttributesCount: 0,
              },
              {
                attributes: [],
                name: 'connectStart',
                timeUnixNano: '1709051097594000000',
                droppedAttributesCount: 0,
              },
              {
                attributes: [],
                name: 'connectEnd',
                timeUnixNano: '1709051097594000000',
                droppedAttributesCount: 0,
              },
              {
                attributes: [],
                name: 'requestStart',
                timeUnixNano: '1709051097596000000',
                droppedAttributesCount: 0,
              },
              {
                attributes: [],
                name: 'responseStart',
                timeUnixNano: '1709051097597000000',
                droppedAttributesCount: 0,
              },
              {
                attributes: [],
                name: 'responseEnd',
                timeUnixNano: '1709051097597000000',
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
];
