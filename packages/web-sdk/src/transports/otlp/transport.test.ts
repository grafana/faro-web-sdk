import { LogEvent, LogLevel, TransportItem, TransportItemType, VERSION } from '@grafana/faro-core';
import { mockInternalLogger } from '@grafana/faro-core/src/testUtils';

import type { OtelTransportPayload } from './payload';
import type { LogRecord } from './payload/transform';
import { OtlpHttpTransport } from './transport';
// import type { OtlpHttpTransportOptions } from './types';

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

  // it('Sends payload after number of signals is >= "batchSendCount" and resets count and payload.', () => {
  //   const transport = new OtlpHttpTransport({
  //     batchSendCount: 1,
  //   } as OtlpHttpTransportOptions);

  //   transport.internalLogger = mockInternalLogger;

  //   const mockSendPayloadFn = jest.fn();
  //   jest.spyOn(transport as any, 'sendPayload').mockImplementation(mockSendPayloadFn);

  //   const mockResetFn = jest.fn();
  //   jest.spyOn(transport as any, 'reset').mockImplementation(mockResetFn);

  //   transport.send(item);
  //   expect(mockSendPayloadFn).toBeCalledTimes(1);
  //   expect(mockResetFn).toBeCalledTimes(1);
  // });

  // it('Sends payload after no new signal has arrived for "batchSendCount" milliseconds after the last one and resets count and payload.', () => {
  //   const timeoutValue = 500;

  //   const transport = new OtlpHttpTransport({
  //     batchSendTimeout: timeoutValue,
  //   } as OtlpHttpTransportOptions);

  //   transport.internalLogger = mockInternalLogger;

  //   jest.useFakeTimers();

  //   const mockSendPayloadFn = jest.fn();
  //   jest.spyOn(transport as any, 'sendPayload').mockImplementation(mockSendPayloadFn);

  //   const mockResetFn = jest.fn();
  //   jest.spyOn(transport as any, 'reset').mockImplementation(mockResetFn);

  //   transport.send(item);
  //   expect(mockSendPayloadFn).not.toBeCalled();
  //   expect(mockResetFn).not.toBeCalled();

  //   jest.advanceTimersByTime(timeoutValue);
  //   expect(mockSendPayloadFn).toBeCalledTimes(1);
  //   expect(mockResetFn).toBeCalledTimes(1);
  // });

  // it('Clears timeout on every send call', () => {
  //   const transport = new OtlpHttpTransport({} as OtlpHttpTransportOptions);
  //   transport.internalLogger = mockInternalLogger;

  //   const mockClearTimeout = jest.fn();
  //   jest.spyOn(global, 'clearTimeout').mockImplementation(mockClearTimeout);

  //   transport.send(item);
  //   transport.send(item);
  //   expect(mockClearTimeout).toBeCalledTimes(2);
  // });

  it('Sends OTEL resources over fetch to their configured endpoints.', () => {
    const transport = new OtlpHttpTransport({
      logsURL: 'https://www.example.com/v1/logs',
      // batchSendCount: 1,
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
      // batchSendCount: 1,
    });
    transport.internalLogger = mockInternalLogger;

    for (let idx = 0; idx < 6; idx++) {
      transport.send(item);
    }

    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('will back off on 429 for default interval if no retry-after header present', async () => {
    jest.useFakeTimers();

    const transport = new OtlpHttpTransport({
      logsURL: 'www.example.com/v1/logs',
      // batchSendCount: 1,
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

    await transport.send(item);
    expect(fetch).toHaveBeenCalledTimes(1);

    await transport.send(item);
    expect(fetch).toHaveBeenCalledTimes(1);

    jest.setSystemTime(new Date(Date.now() + 1001).valueOf());
    await transport.send(item);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('will back off on 429 for default interval if retry-after header present, with delay', async () => {
    jest.useFakeTimers();

    const transport = new OtlpHttpTransport({
      logsURL: 'www.example.com/v1/logs',
      // batchSendCount: 1,
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

    await transport.send(item);
    expect(fetch).toHaveBeenCalledTimes(1);

    jest.setSystemTime(new Date(Date.now() + 1001).valueOf());

    await transport.send(item);
    expect(fetch).toHaveBeenCalledTimes(1);

    jest.setSystemTime(new Date(Date.now() + 1001).valueOf());
    await transport.send(item);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('will back off on 429 for default interval if retry-after header present, with date', async () => {
    jest.useFakeTimers();

    const transport = new OtlpHttpTransport({
      logsURL: 'www.example.com/v1/logs',
      // batchSendCount: 1,
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

    await transport.send(item);
    expect(fetch).toHaveBeenCalledTimes(1);

    jest.setSystemTime(new Date(Date.now() + 1001).valueOf());
    await transport.send(item);
    expect(fetch).toHaveBeenCalledTimes(1);

    jest.setSystemTime(new Date(Date.now() + 2001).valueOf());
    await transport.send(item);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
