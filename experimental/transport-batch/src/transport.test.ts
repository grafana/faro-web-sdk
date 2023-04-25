import { BaseTransport, LogEvent, LogLevel, TransportItem, TransportItemType } from '@grafana/faro-core';
import { mockInternalLogger } from '@grafana/faro-core/src/testUtils';

import { BatchTransport } from './transport';
import type { BatchTransportOptions } from './types';

function useMockTransport() {
  const mockSendFunction = jest.fn();

  class MockTransport extends BaseTransport {
    readonly name = 'mock-transport';
    readonly version = '123';

    constructor() {
      super();
    }

    send = mockSendFunction;
  }

  return {
    mockTransport: new MockTransport(),
    mockSendFunction,
  };
}

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

const fetch = jest.fn(() => Promise.resolve({ status: 200 }));
(global as any).fetch = fetch;

describe('BatchTransport', () => {
  afterEach(() => {
    fetch.mockClear();
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('Sends payload after "batchSendTimeout" milliseconds and resets the buffer.', () => {
    jest.useFakeTimers();

    const { mockSendFunction, mockTransport } = useMockTransport();

    const timeoutValue = 300;

    const transport = new BatchTransport(mockTransport, {
      sendBatchTimeout: timeoutValue,
    } as BatchTransportOptions);

    transport.internalLogger = mockInternalLogger;

    transport.send(item);
    expect(mockSendFunction).not.toBeCalled();

    jest.advanceTimersByTime(timeoutValue + 1);
    expect(mockSendFunction).toBeCalledTimes(1);
  });

  it('Force send timeout is disabled', () => {
    jest.useFakeTimers();

    const newTransportItemArrivedAfterMs = 50;
    const timeoutValue = 100;
    const batchForceSendTimeout = 0;

    const { mockSendFunction, mockTransport } = useMockTransport();

    const transport = new BatchTransport(mockTransport, {
      sendBatchTimeout: timeoutValue,
      batchForceSendTimeout,
    } as BatchTransportOptions);

    transport.internalLogger = mockInternalLogger;

    transport.send(item);
    expect(mockSendFunction).not.toBeCalled();

    jest.advanceTimersByTime(newTransportItemArrivedAfterMs); // 50ms
    expect(mockSendFunction).toBeCalledTimes(0);

    jest.advanceTimersByTime(newTransportItemArrivedAfterMs); // 100ms
    expect(mockSendFunction).toBeCalledTimes(0);

    jest.advanceTimersByTime(newTransportItemArrivedAfterMs); // 150ms
    expect(mockSendFunction).toBeCalledTimes(0);
  });

  it('Sends payload after number of signals is >= "batchSendCount" and resets the buffer.', () => {
    const { mockSendFunction, mockTransport } = useMockTransport();

    const transport = new BatchTransport(mockTransport, {
      batchSendCount: 2,
    } as BatchTransportOptions);

    transport.internalLogger = mockInternalLogger;

    transport.send(item);
    expect(mockSendFunction).toBeCalledTimes(0);

    transport.send(item);
    expect(mockSendFunction).toBeCalledTimes(1);
  });
});
