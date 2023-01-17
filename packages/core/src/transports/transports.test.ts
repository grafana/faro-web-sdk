import type { ExceptionEvent } from '../api';
import { initializeFaro } from '../initialize';
import { mockConfig } from '../testUtils';
import { getCurrentTimestamp } from '../utils';
import { VERSION } from '../version';

import { BaseTransport } from './base';
import { TransportItemType } from './const';
import type { Transport, TransportItem } from './types';

class MockTransport extends BaseTransport implements Transport {
  readonly name = '@grafana/transport-mock';
  readonly version = VERSION;

  sentItems: TransportItem[] = [];

  send(item: TransportItem): void | Promise<void> {
    this.sentItems.push(item);
  }
}

describe('transports', () => {
  describe('config.ignoreErrors', () => {
    it('will filter out errors by string or regex', () => {
      const transport = new MockTransport();

      const { transports } = initializeFaro(
        mockConfig({
          transports: [transport],
          ignoreErrors: ['Error: ResizeObserver', /FetchError[:\s\w\/]*pwc/],
        })
      );

      transports.execute(makeExceptionTransportItem('Error', 'ResizeObserver loop limit exceeded'));
      transports.execute(makeExceptionTransportItem('TypeError', '_.viz is undefined'));
      transports.execute(
        makeExceptionTransportItem(
          'FetchError',
          '404 \n  Instantiating https://pwc.grafana.net/public/react-router-dom'
        )
      );
      transports.execute(
        makeExceptionTransportItem('FetchError', '404 \n  Instantiating https://pwc.grafana.net/public/@emotion/css')
      );
      expect(transport.sentItems).toHaveLength(1);
      expect((transport.sentItems[0]?.payload as ErrorEvent).type).toEqual('TypeError');
    });
  });

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
