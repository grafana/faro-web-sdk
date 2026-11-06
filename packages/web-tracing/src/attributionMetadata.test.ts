import { sendFaroEvents } from './faroTraceExporter.utils';

describe('network attribution metadata', () => {
  it('copies attribution attributes to the associated Faro HTTP event', () => {
    const api = { pushEvent: jest.fn() };

    sendFaroEvents(
      [
        {
          resource: { attributes: [], droppedAttributesCount: 0 },
          scopeSpans: [
            {
              scope: { name: '@opentelemetry/instrumentation-fetch' },
              spans: [
                {
                  traceId: '7fb8581e3db5ebc6be4e36a7a8817cfe',
                  spanId: '4c47d5f85e4b2aec',
                  name: 'HTTP GET',
                  kind: 3,
                  startTimeUnixNano: '1',
                  endTimeUnixNano: '2',
                  attributes: [
                    { key: 'faro.attribution.strategy', value: { stringValue: 'page-route' } },
                    { key: 'faro.attribution.fallback', value: { boolValue: false } },
                  ],
                  droppedAttributesCount: 0,
                  events: [],
                  droppedEventsCount: 0,
                  status: { code: 0 },
                  links: [],
                  droppedLinksCount: 0,
                },
              ],
            },
          ],
        },
      ],
      api as never
    );

    expect(api.pushEvent).toHaveBeenCalledWith(
      'faro.tracing.fetch',
      expect.objectContaining({
        'faro.attribution.strategy': 'page-route',
        'faro.attribution.fallback': 'false',
      }),
      undefined,
      expect.anything()
    );
  });
});
