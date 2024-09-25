import { TraceEvent, TransportItem, TransportItemType } from '@grafana/faro-core';
import { mockInternalLogger } from '@grafana/faro-core/src/testUtils';

import { getTraceTransforms } from './transform';

const item: Readonly<TransportItem<TraceEvent>> = {
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
                traceId: 'ff60009bdfe6e54e98dee1703ffa84f1',
                spanId: '166bfb3133061433',
                parentSpanId: '4d751d61c3d9a833',
                name: 'resourceFetch',
                kind: 1,
                startTimeUnixNano: 1679388692311000000,
                endTimeUnixNano: 1679388692347000000,
                attributes: [
                  {
                    key: 'session_id',
                    value: {
                      stringValue: 'RcuKRynkwa',
                    },
                  },
                  {
                    key: 'component',
                    value: {
                      stringValue: 'document-load',
                    },
                  },
                  {
                    key: 'url.full',
                    value: {
                      stringValue: 'http://localhost:5173/src/client/pages/Features/Features.tsx?t=1679329135042',
                    },
                  },
                  {
                    key: 'http.response_content_length',
                    value: {
                      intValue: 9951,
                    },
                  },
                ],
                droppedAttributesCount: 0,
                events: [
                  {
                    attributes: [],
                    name: 'fetchStart',
                    timeUnixNano: 1679388692311000000,
                    droppedAttributesCount: 0,
                  },
                  {
                    attributes: [],
                    name: 'domainLookupStart',
                    timeUnixNano: 1679388692311000000,
                    droppedAttributesCount: 0,
                  },
                  {
                    attributes: [],
                    name: 'domainLookupEnd',
                    timeUnixNano: 1679388692311000000,
                    droppedAttributesCount: 0,
                  },
                  {
                    attributes: [],
                    name: 'connectStart',
                    timeUnixNano: 1679388692311000000,
                    droppedAttributesCount: 0,
                  },
                  {
                    attributes: [],
                    name: 'secureConnectionStart',
                    timeUnixNano: 1679388691942000000,
                    droppedAttributesCount: 0,
                  },
                  {
                    attributes: [],
                    name: 'connectEnd',
                    timeUnixNano: 1679388692311000000,
                    droppedAttributesCount: 0,
                  },
                  {
                    attributes: [],
                    name: 'requestStart',
                    timeUnixNano: 1679388692345000000,
                    droppedAttributesCount: 0,
                  },
                  {
                    attributes: [],
                    name: 'responseStart',
                    timeUnixNano: 1679388692347000000,
                    droppedAttributesCount: 0,
                  },
                  {
                    attributes: [],
                    name: 'responseEnd',
                    timeUnixNano: 1679388692347000000,
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
      os: 'browser-operating-system',
      mobile: false,
      userAgent: 'browser-ua-string',
      language: 'browser-language',
      viewportHeight: '1080',
      viewportWidth: '1920',
    },
    sdk: {
      name: 'integration-web-sdk-name',
      version: 'integration-v1.2.3',
      integrations: [
        {
          name: 'integration-attribute-one',
          version: 'one',
        },
        {
          name: 'integration-attribute-two',
          version: 'two',
        },
      ],
    },
    app: {
      name: 'app-cool-app',
      release: 'app-v1.23',
      version: 'app-v2.0.0',
      environment: 'app-production',
    },
  },
};

const matchResourceSpanPayload = {
  resource: {
    attributes: [
      {
        key: 'browser.mobile',
        value: { boolValue: false },
      },

      {
        key: 'user_agent.original',
        value: { stringValue: 'browser-ua-string' },
      },
      {
        key: 'browser.language',
        value: { stringValue: 'browser-language' },
      },
      {
        key: 'browser.platform',
        value: { stringValue: 'browser-operating-system' },
      },
      {
        key: 'browser.name',
        value: { stringValue: 'browser-name' },
      },
      {
        key: 'browser.version',
        value: { stringValue: 'browser-v109.0' },
      },
      {
        key: 'browser.screen_width',
        value: {
          stringValue: '1920',
        },
      },
      {
        key: 'browser.screen_height',
        value: {
          stringValue: '1080',
        },
      },
      {
        key: 'telemetry.sdk.name',
        value: { stringValue: 'integration-web-sdk-name' },
      },
      {
        key: 'telemetry.sdk.version',
        value: { stringValue: 'integration-v1.2.3' },
      },
      // Not decided yet if we add language attribute
      {
        key: 'telemetry.sdk.language',
        value: { stringValue: 'webjs' },
      },
      {
        key: 'service.name',
        value: { stringValue: 'app-cool-app' },
      },
      {
        key: 'service.version',
        value: { stringValue: 'app-v2.0.0' },
      },
      {
        key: 'deployment.environment.name',
        value: { stringValue: 'app-production' },
      },
    ],
  },
  scopeSpans: [
    {
      scope: { name: '@opentelemetry/instrumentation-document-load', version: '0.31.0' },
      spans: [
        {
          traceId: 'ff60009bdfe6e54e98dee1703ffa84f1',
          spanId: '166bfb3133061433',
          parentSpanId: '4d751d61c3d9a833',
          name: 'resourceFetch',
          kind: 1,
          startTimeUnixNano: 1679388692311000000,
          endTimeUnixNano: 1679388692347000000,
          attributes: [
            { key: 'session_id', value: { stringValue: 'RcuKRynkwa' } },
            { key: 'component', value: { stringValue: 'document-load' } },
            {
              key: 'url.full',
              value: { stringValue: 'http://localhost:5173/src/client/pages/Features/Features.tsx?t=1679329135042' },
            },
            { key: 'http.response_content_length', value: { intValue: 9951 } },
          ],
          droppedAttributesCount: 0,
          events: [
            { attributes: [], name: 'fetchStart', timeUnixNano: 1679388692311000000, droppedAttributesCount: 0 },
            {
              attributes: [],
              name: 'domainLookupStart',
              timeUnixNano: 1679388692311000000,
              droppedAttributesCount: 0,
            },
            { attributes: [], name: 'domainLookupEnd', timeUnixNano: 1679388692311000000, droppedAttributesCount: 0 },
            { attributes: [], name: 'connectStart', timeUnixNano: 1679388692311000000, droppedAttributesCount: 0 },
            {
              attributes: [],
              name: 'secureConnectionStart',
              timeUnixNano: 1679388691942000000,
              droppedAttributesCount: 0,
            },
            { attributes: [], name: 'connectEnd', timeUnixNano: 1679388692311000000, droppedAttributesCount: 0 },
            { attributes: [], name: 'requestStart', timeUnixNano: 1679388692345000000, droppedAttributesCount: 0 },
            { attributes: [], name: 'responseStart', timeUnixNano: 1679388692347000000, droppedAttributesCount: 0 },
            { attributes: [], name: 'responseEnd', timeUnixNano: 1679388692347000000, droppedAttributesCount: 0 },
          ],
          droppedEventsCount: 0,
          status: { code: 0 },
          links: [],
          droppedLinksCount: 0,
        },
      ],
    },
  ],
} as const;

describe('toResourceSpan()', () => {
  const { toResourceSpan } = getTraceTransforms(mockInternalLogger);

  it('Builds a valid ResourceLogs structure', () => {
    const resourceSpan = toResourceSpan(item);
    expect(resourceSpan).toMatchObject(matchResourceSpanPayload);
  });
});
