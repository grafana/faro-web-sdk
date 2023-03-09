import { LogEvent, LogLevel, TransportItem, TransportItemType, VERSION } from '@grafana/faro-core';
import { mockInternalLogger } from '@grafana/faro-core/src/testUtils';

import type { LogRecord, OtelTransportPayload } from './payload';
import { OtlpHttpTransport } from './transport';

const item: TransportItem<LogEvent> = {
  type: TransportItemType.LOG,
  payload: {
    context: {},
    level: LogLevel.INFO,
    message: 'hi',
    timestamp: '2023-01-27T09:53:01.035Z',
  },
  meta: {},
} as const;

const otelTransportPayload: OtelTransportPayload['resourceLogs'] = [
  {
    resource: {
      attributes: [],
    },
    scopeLogs: [
      {
        scope: {
          name: '@grafana/faro-web-sdk',
          version: VERSION,
        },
        logRecords: [
          {
            timeUnixNano: 1674813181035000000,
            severityNumber: 10,
            severityText: 'INFO2',
            body: {
              stringValue: 'hi',
            },
            attributes: [],
          } as LogRecord,
        ],
      },
    ],
  },
];

const fetch = jest.fn(() => Promise.resolve({ status: 200 }));
(global as any).fetch = fetch;

describe('OtlpHttpTransport', () => {
  afterEach(() => {
    fetch.mockClear();
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('Sends OTEL resources over fetch to their configured endpoints.', () => {
    const transport = new OtlpHttpTransport({
      logsURL: 'https://www.example.com/v1/logs',
    });
    transport.internalLogger = mockInternalLogger;

    transport.send(item);

    expect(fetch).toHaveBeenCalledTimes(1);

    expect(fetch).toHaveBeenCalledWith('https://www.example.com/v1/logs', {
      body: JSON.stringify(otelTransportPayload),
      headers: {
        'Content-Type': 'application/json',
      },
      keepalive: true,
      method: 'POST',
    });
  });

  it('will not send events if buffer size is exhausted', () => {
    const transport = new OtlpHttpTransport({
      logsURL: 'www.example.com/v1/logs',
      bufferSize: 3,
    });
    transport.internalLogger = mockInternalLogger;

    for (let idx = 0; idx < 6; idx++) {
      transport.send(item);
    }

    expect(fetch).toHaveBeenCalledTimes(3);
  });

  // TODO: add case for resourceSpans once the respective transform is implemented
  it.each([{ v: item, type: 'resourceLogs' }])(
    `will back off on 429 for default interval if no retry-after header present while sending $type`,
    async ({ v }) => {
      jest.useFakeTimers();

      const transport = new OtlpHttpTransport({
        logsURL: 'www.example.com/v1/logs',
        tracesURL: 'www.example.com/v1/traces',
        defaultRateLimitBackoffMs: 1000,
      });

      transport.internalLogger = mockInternalLogger;

      fetch.mockImplementationOnce(() =>
        Promise.resolve({
          status: 429,
          headers: {
            get: () => '',
          },
        })
      );

      await transport.send(v);
      expect(fetch).toHaveBeenCalledTimes(1);

      await transport.send(v);
      expect(fetch).toHaveBeenCalledTimes(1);

      jest.setSystemTime(new Date(Date.now() + 1001).valueOf());
      await transport.send(v);
      expect(fetch).toHaveBeenCalledTimes(2);
    }
  );

  // TODO: add case for resourceSpans once the respective transform is implemented
  it.each([{ v: item, type: 'resourceLogs' }])(
    'will back off on 429 for default interval if retry-after header present, with delay while sending $type',
    async ({ v }) => {
      jest.useFakeTimers();

      const transport = new OtlpHttpTransport({
        logsURL: 'www.example.com/v1/logs',
        defaultRateLimitBackoffMs: 1000,
      });

      transport.internalLogger = mockInternalLogger;

      fetch.mockImplementationOnce(() =>
        Promise.resolve({
          status: 429,
          headers: {
            get: () => '2',
          },
        })
      );

      await transport.send(v);
      expect(fetch).toHaveBeenCalledTimes(1);

      jest.setSystemTime(new Date(Date.now() + 1001).valueOf());

      await transport.send(v);
      expect(fetch).toHaveBeenCalledTimes(1);

      jest.setSystemTime(new Date(Date.now() + 1001).valueOf());
      await transport.send(v);
      expect(fetch).toHaveBeenCalledTimes(2);
    }
  );

  // TODO: add case for resourceSpans once the respective transform is implemented
  it.each([{ v: item, type: 'resourceLogs' }])(
    'will back off on 429 for default interval if retry-after header present, with date while sending $type',
    async ({ v }) => {
      jest.useFakeTimers();

      const transport = new OtlpHttpTransport({
        logsURL: 'www.example.com/v1/logs',
        defaultRateLimitBackoffMs: 1000,
      });

      transport.internalLogger = mockInternalLogger;

      fetch.mockImplementationOnce(() =>
        Promise.resolve({
          status: 429,
          headers: {
            get: () => new Date(Date.now() + 3000).toISOString(),
          },
        })
      );

      await transport.send(v);
      expect(fetch).toHaveBeenCalledTimes(1);

      jest.setSystemTime(new Date(Date.now() + 1001).valueOf());
      await transport.send(v);
      expect(fetch).toHaveBeenCalledTimes(1);

      jest.setSystemTime(new Date(Date.now() + 2001).valueOf());
      await transport.send(v);
      expect(fetch).toHaveBeenCalledTimes(2);
    }
  );

  it('sends batched items', () => {
    const transport = new OtlpHttpTransport({
      logsURL: 'https://www.example.com/v1/logs',
    });

    transport.internalLogger = mockInternalLogger;

    const secondItem = { ...item, payload: { ...item.payload, message: 'foo' } };

    transport.send([item, secondItem]);

    expect(fetch).toHaveBeenCalledTimes(1);

    expect(fetch).toHaveBeenCalledWith('https://www.example.com/v1/logs', {
      body: JSON.stringify([
        {
          resource: {
            attributes: [],
          },
          scopeLogs: [
            {
              scope: {
                name: '@grafana/faro-web-sdk',
                version: VERSION,
              },
              logRecords: [
                {
                  timeUnixNano: 1674813181035000000,
                  severityNumber: 10,
                  severityText: 'INFO2',
                  body: {
                    stringValue: 'hi',
                  },
                  attributes: [],
                } as LogRecord,
                {
                  timeUnixNano: 1674813181035000000,
                  severityNumber: 10,
                  severityText: 'INFO2',
                  body: {
                    stringValue: 'foo',
                  },
                  attributes: [],
                } as LogRecord,
              ],
            },
          ],
        },
      ]),
      headers: {
        'Content-Type': 'application/json',
      },
      keepalive: true,
      method: 'POST',
    });
  });
});
