/**
 * @jest-environment jsdom
 */
import { LogEvent, LogLevel, TransportItem, TransportItemType } from '..';

import { BatchExecutor } from './batchExecutor';

const generateTransportItem = (randomMeta?: boolean): TransportItem<LogEvent> => ({
  type: TransportItemType.LOG,
  payload: {
    context: {},
    level: LogLevel.INFO,
    message: 'hi',
    timestamp: '2023-01-27T09:53:01.035Z',
  },
  meta: {
    sdk: {
      name: randomMeta ? (Math.random() + 1).toString(36).substring(7) : 'test-sdk',
    },
  },
});

describe('BatchExecutor', () => {
  it('tests instantiating BatchExecutor class', () => {
    const sendSpy = jest.fn();
    const be = new BatchExecutor(sendSpy);
    expect(be).toBeInstanceOf(BatchExecutor);
  });

  describe('config options', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    beforeAll(() => {
      jest.useFakeTimers();
    });

    it('tests send when exceeding batch size', () => {
      const mockSendFunction = jest.fn();
      const item = generateTransportItem();
      const be = new BatchExecutor(mockSendFunction, {
        sendTimeout: 1,
        itemLimit: 2,
      });

      be.addItem(item);
      expect(mockSendFunction).not.toHaveBeenCalled();

      be.addItem(item);
      expect(mockSendFunction).toHaveBeenCalledTimes(1);
    });

    it('tests send with empty buffer', () => {
      const mockSendFunction = jest.fn();
      new BatchExecutor(mockSendFunction, {
        sendTimeout: 1,
      });

      jest.advanceTimersByTime(2);
      expect(mockSendFunction).not.toHaveBeenCalled();
    });

    it('tests send when "visibilitychange" event is emitted and visibilityState changes', () => {
      const mockSendFunction = jest.fn();
      const item = generateTransportItem();
      const be = new BatchExecutor(mockSendFunction, {
        sendTimeout: 1,
      });

      be.addItem(item);
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get() {
          return 'hidden';
        },
      });
      document.dispatchEvent(new Event('visibilitychange'));
      expect(mockSendFunction).toHaveBeenCalledTimes(1);
    });

    it('tests send when "visibilitychange" event is emitted and visibilityState changes to visible', () => {
      const mockSendFunction = jest.fn();
      const item = generateTransportItem();
      const be = new BatchExecutor(mockSendFunction, {
        sendTimeout: 1,
      });

      be.addItem(item);
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get() {
          return 'visible';
        },
      });
      document.dispatchEvent(new Event('visibilitychange'));
      expect(mockSendFunction).toHaveBeenCalledTimes(0);
    });

    it('tests send when starting paused', () => {
      const mockSendFunction = jest.fn();
      const item = generateTransportItem();
      const be = new BatchExecutor(mockSendFunction, {
        sendTimeout: 1,
        paused: true,
      });

      be.addItem(item);
      jest.advanceTimersByTime(2);

      expect(mockSendFunction).not.toHaveBeenCalled();
    });

    it('tests send when paused', () => {
      const mockSendFunction = jest.fn();
      const item = generateTransportItem();
      const be = new BatchExecutor(mockSendFunction, {
        sendTimeout: 1,
      });

      be.addItem(item);
      be.pause();
      jest.advanceTimersByTime(2);

      expect(mockSendFunction).not.toHaveBeenCalled();
    });

    it('tests send when unpaused', () => {
      const mockSendFunction = jest.fn();
      const item = generateTransportItem();
      const be = new BatchExecutor(mockSendFunction, {
        sendTimeout: 1,
      });

      be.addItem(item);
      be.pause();
      jest.advanceTimersByTime(2);
      be.start();

      expect(mockSendFunction).not.toHaveBeenCalled();
      jest.advanceTimersByTime(2);
      expect(mockSendFunction).toHaveBeenCalledTimes(1);
    });

    it('tests groupItems', () => {
      const be = new BatchExecutor(() => {}, {
        sendTimeout: 1,
      });
      const itemsWithSameMeta = [...Array(3)].map(() => generateTransportItem(false));
      const itemsWithRandomMeta = [...Array(5)].map(() => generateTransportItem(true));
      const groups = be.groupItems([...itemsWithSameMeta, ...itemsWithRandomMeta]);
      expect(groups).toHaveLength(itemsWithRandomMeta.length + 1);
    });

    it('tests grouping', () => {
      const mockSendFunction = jest.fn();
      const be = new BatchExecutor(mockSendFunction, {
        sendTimeout: 1,
      });
      be.start();
      const item = generateTransportItem();

      be.addItem({
        ...item,
        meta: {
          sdk: {
            name: 'foo',
          },
        },
      });
      be.addItem({
        ...item,
        meta: {
          sdk: {
            name: 'foo',
          },
        },
      });

      be.addItem({
        ...item,
        meta: {
          sdk: {
            name: 'bar',
          },
        },
      });

      jest.advanceTimersByTime(2);
      expect(mockSendFunction).toHaveBeenCalledTimes(2);
    });
  });
});
