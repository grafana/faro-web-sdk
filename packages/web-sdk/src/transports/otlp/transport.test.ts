import { LogEvent, LogLevel, TransportItem, TransportItemType, VERSION } from '@grafana/faro-core';

import type { OtelTransportPayload } from './payload';
import type { LogLogRecordPayload } from './payload/transform';

import { OtlpHttpTransport } from './transport';
import type { OtlpHttpTransportOptions } from './types';

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
          } as LogLogRecordPayload,
        ],
      },
    ],
  },
];

const fetch = jest.fn(() => Promise.resolve({ status: 200 }));
(global as any).fetch = fetch;

describe('OtlpHttpTransport', () => {
  beforeEach(() => {
    fetch.mockClear();
    jest.restoreAllMocks();
  });

  it('Sends payload after number of signals is >= "batchSendCount" and resets count and payload.', () => {
    const transport = new OtlpHttpTransport({
      batchSendCount: 1,
    } as OtlpHttpTransportOptions);

    const mockSendPayloadFn = jest.fn();
    jest.spyOn(transport as any, 'sendPayload').mockImplementation(mockSendPayloadFn);

    const mockResetFn = jest.fn();
    jest.spyOn(transport as any, 'reset').mockImplementation(mockResetFn);

    transport.send(item);
    expect(mockSendPayloadFn).toBeCalledTimes(1);
    expect(mockResetFn).toBeCalledTimes(1);
  });

  it('Sends payload after no new signal has arrived for "batchSendCount" milliseconds after the last one and resets count and payload.', () => {
    const timeoutValue = 500;

    const transport = new OtlpHttpTransport({
      batchSendTimeout: timeoutValue,
    } as OtlpHttpTransportOptions);

    jest.useFakeTimers();

    const mockSendPayloadFn = jest.fn();
    jest.spyOn(transport as any, 'sendPayload').mockImplementation(mockSendPayloadFn);

    const mockResetFn = jest.fn();
    jest.spyOn(transport as any, 'reset').mockImplementation(mockResetFn);

    transport.send(item);
    expect(mockSendPayloadFn).not.toBeCalled();
    expect(mockResetFn).not.toBeCalled();

    jest.advanceTimersByTime(timeoutValue);
    expect(mockSendPayloadFn).toBeCalledTimes(1);
    expect(mockResetFn).toBeCalledTimes(1);
  });

  it('Clears timeout on every send call', () => {
    const transport = new OtlpHttpTransport({} as OtlpHttpTransportOptions);

    const mockClearTimeout = jest.fn();
    jest.spyOn(global, 'clearTimeout').mockImplementation(mockClearTimeout);

    transport.send(item);
    transport.send(item);
    expect(mockClearTimeout).toBeCalledTimes(2);
  });

  it('Sends OTEL resources over fetch to their configured endpoints.', () => {
    const transport = new OtlpHttpTransport({
      scheme: 'http',
      host: 'example.com',
      batchSendCount: 1,
    });

    transport.send(item);

    expect(fetch).toHaveBeenCalledTimes(1);

    expect(fetch).toHaveBeenCalledWith('http://example.com/v1/logs', {
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
      scheme: 'http',
      host: 'example.com',
      bufferSize: 3,
      batchSendCount: 1,
    });

    for (let idx = 0; idx < 6; idx++) {
      transport.send(item);
    }

    expect(fetch).toHaveBeenCalledTimes(3);
  });
});
