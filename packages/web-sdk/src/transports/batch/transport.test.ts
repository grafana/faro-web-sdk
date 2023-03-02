import { BaseTransport, LogEvent, LogLevel, TransportItem, TransportItemType } from '@grafana/faro-core';
import { mockInternalLogger } from '@grafana/faro-core/src/testUtils';

import { BatchTransport } from './transport';
import type { BatchTransportOptions } from './types';

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

  it('Sends payload after no new signal has arrived for "batchSendCount" milliseconds after the last one and resets count and payload.', () => {
    jest.useFakeTimers();

    const mockSendFunction = jest.fn();

    class MockTransport extends BaseTransport {
      readonly name = 'mock-transport';
      readonly version = '123';

      constructor() {
        super();
      }

      send = mockSendFunction;
    }

    const timeoutValue = 500;

    const transport = new BatchTransport(new MockTransport(), {
      batchSendTimeout: timeoutValue,
    } as BatchTransportOptions);

    transport.internalLogger = mockInternalLogger;

    transport.send(item);
    expect(mockSendFunction).not.toBeCalled();

    jest.advanceTimersByTime(timeoutValue + 1);
    expect(mockSendFunction).toBeCalledTimes(1);
  });

  it('Sends payload after number of signals is >= "batchSendCount" and resets count and payload.', () => {
    const mockSendFunction = jest.fn();

    class MockTransport extends BaseTransport {
      readonly name = 'mock-transport';
      readonly version = '123';

      constructor() {
        super();
      }

      send = mockSendFunction;
    }

    const transport = new BatchTransport(new MockTransport(), {
      batchSendCount: 2,
    } as BatchTransportOptions);

    transport.internalLogger = mockInternalLogger;

    transport.send(item);
    transport.send(item);
    expect(mockSendFunction).toBeCalledTimes(1);
  });

  it('Clears timeout on every send call', () => {
    const mockSendFunction = jest.fn();

    class MockTransport extends BaseTransport {
      readonly name = 'mock-transport';
      readonly version = '123';

      constructor() {
        super();
      }

      send = mockSendFunction;
    }

    const transport = new BatchTransport(new MockTransport(), {} as BatchTransportOptions);

    transport.internalLogger = mockInternalLogger;

    const mockClearTimeout = jest.fn();
    jest.spyOn(global, 'clearTimeout').mockImplementation(mockClearTimeout);

    transport.send(item);
    transport.send(item);
    expect(mockClearTimeout).toBeCalledTimes(2);
  });
});
