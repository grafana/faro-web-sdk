/**
 * @jest-environment node
 *
 * Verifies that BatchExecutor can be constructed and run inside scopes that have no `document`
 * and no `window` — i.e. dedicated workers and shared workers. The `node` jest environment is the
 * closest readily-available match: neither global is defined, so a regression that reintroduces
 * `window.setInterval` or `document.addEventListener` at construction time will throw here.
 */
import { LogEvent, LogLevel, TransportItem, TransportItemType } from '..';

import { BatchExecutor } from './batchExecutor';

const generateTransportItem = (): TransportItem<LogEvent> => ({
  type: TransportItemType.LOG,
  payload: {
    context: {},
    level: LogLevel.INFO,
    message: 'hi',
    timestamp: '2023-01-27T09:53:01.035Z',
  },
  meta: { sdk: { name: 'test-sdk' } },
});

describe('BatchExecutor (worker-like scope: no document/window)', () => {
  it('confirms the test environment has neither document nor window', () => {
    expect(typeof document).toBe('undefined');
    expect(typeof window).toBe('undefined');
  });

  it('constructs without throwing', () => {
    let be: BatchExecutor | undefined;
    expect(() => {
      be = new BatchExecutor(jest.fn());
    }).not.toThrow();
    be?.pause();
  });

  it('constructs without throwing when started paused', () => {
    expect(() => new BatchExecutor(jest.fn(), { paused: true })).not.toThrow();
  });

  it('flushes via the worker-safe interval timer', () => {
    jest.useFakeTimers();
    let be: BatchExecutor | undefined;
    try {
      const mockSendFunction = jest.fn();
      be = new BatchExecutor(mockSendFunction, { sendTimeout: 1 });
      be.addItem(generateTransportItem());

      expect(mockSendFunction).not.toHaveBeenCalled();
      jest.advanceTimersByTime(2);
      expect(mockSendFunction).toHaveBeenCalledTimes(1);
    } finally {
      be?.pause();
      jest.useRealTimers();
    }
  });
});
