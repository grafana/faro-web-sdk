/**
 * @jest-environment jsdom
 */
import type { ExceptionEvent } from '../api';
import { initializeFaro } from '../initialize';
import { mockConfig } from '../testUtils';
import { getCurrentTimestamp } from '../utils';
import { VERSION } from '../version';

import { BaseTransport } from './base';
import { TransportItemType } from './const';
import type { Transport, TransportItem } from './types';

class MockSingleTransport extends BaseTransport implements Transport {
  readonly name = '@grafana/transport-mock';
  readonly version = VERSION;

  sentItems: TransportItem[] = [];

  send(item: TransportItem): void | Promise<void> {
    this.sentItems.push(item);
  }
}

const sendSingleMock = jest.spyOn(MockSingleTransport.prototype, 'send');

class MockTransport extends BaseTransport implements Transport {
  readonly name = '@grafana/transport-single-mock';
  readonly version = VERSION;

  sentItems: TransportItem[] = [];

  send(items: TransportItem[]): void | Promise<void> {
    this.sentItems.push(...items);
  }

  override isBatched(): boolean {
    return true;
  }
}

const sendMock = jest.spyOn(MockTransport.prototype, 'send');

describe('transports', () => {
  describe('config.beforeSend', () => {
    it('will not send events that are rejected by beforeSend hook', () => {
      const transport = new MockTransport();
      const hookedItems: TransportItem[] = [];

      const { transports } = initializeFaro(
        mockConfig({
          transports: [transport],
          beforeSend: (item: TransportItem) => {
            hookedItems.push(item);

            if (item.type === TransportItemType.EXCEPTION && (item.payload as ErrorEvent).type === 'TypeError') {
              return null;
            }

            return item;
          },
        })
      );

      transports.execute(makeExceptionTransportItem('Error', 'ResizeObserver loop limit exceeded'));
      transports.execute(makeExceptionTransportItem('TypeError', '_.viz is undefined'));

      expect(transport.sentItems).toHaveLength(1);
      expect(hookedItems).toHaveLength(2);
      expect((transport.sentItems[0]?.payload as ErrorEvent).type).toEqual('Error');
    });

    it('events can be modified by beforeSend hook', () => {
      const transport = new MockTransport();

      const { transports } = initializeFaro(
        mockConfig({
          transports: [transport],
          beforeSend: (item: TransportItem) => {
            if (item.type === TransportItemType.EXCEPTION) {
              return {
                ...item,
                payload: {
                  ...item.payload,
                  type: 'NewType',
                },
              };
            }
            return item;
          },
        })
      );

      transports.execute(makeExceptionTransportItem('Error', 'ResizeObserver loop limit exceeded'));
      expect(transport.sentItems).toHaveLength(1);
      expect((transport.sentItems[0]?.payload as ErrorEvent).type).toEqual('NewType');
    });

    it('Only call beforeSentHooks once in batched mode.', () => {
      const transport = new MockTransport();

      const mockBeforeSend = jest.fn((item) => item);

      const { transports } = initializeFaro(
        mockConfig({
          transports: [transport],
          beforeSend: mockBeforeSend,
          batching: {
            enabled: true,
            sendTimeout: 1,
            itemLimit: 1,
          },
        })
      );

      transports.execute(makeExceptionTransportItem('Error', 'ResizeObserver loop limit exceeded'));
      expect(mockBeforeSend).toHaveBeenCalledTimes(1);
    });

    it('Call beforeSentHooks two times if in batched mode but with an existing transport which is not batched', () => {
      const transport = new MockTransport();

      const nonBachedTransport = new MockTransport();
      nonBachedTransport.isBatched = () => false;
      (nonBachedTransport.name as any) = 'non-batched-transport';

      const mockBeforeSend = jest.fn((item) => item);

      const { transports } = initializeFaro(
        mockConfig({
          transports: [transport, nonBachedTransport],
          beforeSend: mockBeforeSend,
          batching: {
            enabled: true,
            sendTimeout: 1,
            itemLimit: 1,
          },
        })
      );

      transports.execute(makeExceptionTransportItem('Error', 'ResizeObserver loop limit exceeded'));
      expect(mockBeforeSend).toHaveBeenCalledTimes(2);
    });

    it('Sanitizes data before sending', () => {
      const transport = new MockTransport();
      const { api } = initializeFaro(
        mockConfig({
          isolate: true,
          instrumentations: [],
          transports: [transport],
          batching: {
            enabled: true,
            itemLimit: 1,
          },
          preserveOriginalError: true,
        })
      );

      api.pushError(new Error('Kaboom1'));
      api.pushError(new Error('Kaboom2'));

      expect(transport.sentItems).toHaveLength(2);
      expect(transport.sentItems[0]).not.toHaveProperty('originalError');
      expect(transport.sentItems[1]).not.toHaveProperty('originalError');
    });

    it('Original error is available in beforeSend function', () => {
      const mockBeforeSend = jest.fn();
      const transport = new MockTransport();
      const { api } = initializeFaro(
        mockConfig({
          isolate: true,
          instrumentations: [],
          transports: [transport],
          batching: {
            enabled: true,
            itemLimit: 1,
          },
          preserveOriginalError: true,
          beforeSend: mockBeforeSend,
        })
      );

      const myError = new Error('Kaboom');
      api.pushError(myError, { originalError: myError });

      expect(mockBeforeSend).toHaveBeenCalledTimes(1);
      expect(mockBeforeSend.mock.calls[0][0]).toHaveProperty('payload.originalError', myError);
    });
  });

  describe('multiple transports of the same type', () => {
    const transport1 = new MockTransport();
    const transport2 = new MockTransport();

    const { transports } = initializeFaro(
      mockConfig({
        isolate: true,
        instrumentations: [],
        transports: [transport1, transport2],
      })
    );

    it('will all be added and receive events', () => {
      transports.execute(makeExceptionTransportItem('Error', 'ResizeObserver loop limit exceeded'));
      expect(transport1.sentItems).toHaveLength(1);
      expect(transport2.sentItems).toHaveLength(1);
    });

    it('one of them can be removed by instance', () => {
      transports.remove(transport1);
      transports.execute(makeExceptionTransportItem('Error', 'Kaboom'));
      expect(transport1.sentItems).toHaveLength(1);
      expect(transport2.sentItems).toHaveLength(2);
    });
  });

  describe('test batched transports and single item ones', () => {
    beforeAll(() => {
      jest.useFakeTimers();
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('single item transports with batching enabled', () => {
      const transport = new MockSingleTransport();
      const { transports } = initializeFaro(
        mockConfig({
          isolate: true,
          instrumentations: [],
          transports: [transport],
          batching: {
            enabled: true,
            sendTimeout: 1,
          },
        })
      );

      const item1 = makeExceptionTransportItem('Error', 'Kaboom');
      const item2 = makeExceptionTransportItem('Error', 'Kaboom');

      transports.execute(item1);
      transports.execute(item2);
      jest.advanceTimersByTime(1);

      expect(sendSingleMock).toHaveBeenCalledTimes(2);
      expect(sendSingleMock.mock.calls).toEqual([[item1], [item2]]);
    });

    it('multiple item transports', () => {
      const transport = new MockTransport();
      const { transports } = initializeFaro(
        mockConfig({
          isolate: true,
          instrumentations: [],
          transports: [transport],
          batching: {
            enabled: true,
            sendTimeout: 1,
          },
        })
      );

      const item1 = makeExceptionTransportItem('Error', 'Kaboom');
      const item2 = makeExceptionTransportItem('Error', 'Kaboom');

      transports.execute(item1);
      transports.execute(item2);
      jest.advanceTimersByTime(1);

      expect(sendMock).toHaveBeenCalledWith([item1, item2]);
    });
  });
});

function makeExceptionTransportItem(type: string, value: string): TransportItem<ExceptionEvent> {
  return {
    type: TransportItemType.EXCEPTION,
    payload: {
      type,
      value,
      timestamp: getCurrentTimestamp(),
      stacktrace: {
        frames: [],
      },
    },
    meta: {},
  };
}
