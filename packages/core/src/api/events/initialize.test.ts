import type { TransportItem } from '../..';
import { initializeFaro } from '../../initialize';
import { mockConfig, mockInternalLogger, MockTransport } from '../../testUtils';
import { mockMetas, mockTracesApi, mockTransports, mockUserActionsApi } from '../apiTestHelpers';
import type { API } from '../types';
import UserAction from '../userActions/userAction';

import { initializeEventsAPI } from './initialize';
import type { EventEvent, PushEventOptions } from './types';

describe('api.events', () => {
  function createAPI({ dedupe }: { dedupe: boolean } = { dedupe: true }): [API, MockTransport] {
    const transport = new MockTransport();
    const config = mockConfig({
      dedupe,
      transports: [transport],
    });

    const { api } = initializeFaro(config);

    return [api, transport];
  }

  describe('pushEvent', () => {
    let api: API;
    let transport: MockTransport;

    beforeEach(() => {
      [api, transport] = createAPI();
    });

    describe('Filtering', () => {
      it('filters the same event', () => {
        api.pushEvent('test', {
          a: '1',
        });
        expect(transport.items).toHaveLength(1);

        api.pushEvent('test', {
          a: '1',
        });
        expect(transport.items).toHaveLength(1);
      });

      it("doesn't filter events with same name and partially same values", () => {
        api.pushEvent('test', {
          a: '1',
        });
        expect(transport.items).toHaveLength(1);

        api.pushEvent('test', {
          a: '1',
          b: '2',
        });
        expect(transport.items).toHaveLength(2);
      });

      it("doesn't filter events with different name and same values", () => {
        api.pushEvent('test1', {
          a: '1',
        });
        expect(transport.items).toHaveLength(1);

        api.pushEvent('test2', {
          a: '1',
        });
        expect(transport.items).toHaveLength(2);
      });

      it("filters an event and doesn't filter the next different one", () => {
        api.pushEvent('test1', {
          a: '1',
        });
        expect(transport.items).toHaveLength(1);

        api.pushEvent('test1', {
          a: '1',
        });
        expect(transport.items).toHaveLength(1);

        api.pushEvent('test2', {
          b: '1',
        });
        expect(transport.items).toHaveLength(2);
      });

      it("doesn't filter when dedupe is false", () => {
        [api, transport] = createAPI({ dedupe: false });

        api.pushEvent('test');
        expect(transport.items).toHaveLength(1);

        api.pushEvent('test');
        expect(transport.items).toHaveLength(2);
      });

      it("doesn't filter when skipDedupe is true", () => {
        api.pushEvent('test');
        expect(transport.items).toHaveLength(1);

        api.pushEvent('test', {}, undefined, { skipDedupe: true });
        expect(transport.items).toHaveLength(2);
      });

      it('uses traceId and spanId from custom context', () => {
        const spanContext: PushEventOptions['spanContext'] = {
          traceId: 'my-trace-id',
          spanId: 'my-span-id',
        };

        const mockGetTraceContext = jest.fn();
        jest.spyOn(api, 'getTraceContext').mockImplementationOnce(mockGetTraceContext);

        api.pushEvent('test', undefined, undefined, { spanContext });

        expect(mockGetTraceContext).not.toHaveBeenCalled();
        expect((transport.items[0]?.payload as EventEvent).trace).toStrictEqual({
          trace_id: 'my-trace-id',
          span_id: 'my-span-id',
        });
      });

      it('Sets the timestamp to the provided custom timestamp', () => {
        api.pushEvent('test', undefined, undefined, { timestampOverwriteMs: 123 });
        expect(transport.items).toHaveLength(1);
        expect((transport.items[0]?.payload as EventEvent).timestamp).toBe('1970-01-01T00:00:00.123Z');
      });

      it('stringifies all values in the attributes object', () => {
        api.pushEvent('test', {
          // @ts-expect-error
          a: 1,
          b: 'foo',
          // @ts-expect-error
          c: true,
          // @ts-expect-error
          d: { e: 'bar' },
          // @ts-expect-error
          g: null,
          // @ts-expect-error
          h: undefined,
          // @ts-expect-error
          i: [1, 2, 3],
        });

        // @ts-expect-error
        expect(transport.items[0]?.payload.attributes).toStrictEqual({
          a: '1',
          b: 'foo',
          c: 'true',
          d: '{"e":"bar"}',
          g: 'null',
          h: 'undefined',
          i: '[1,2,3]',
        });
      });

      it('does not stringify empty attributes', () => {
        api.pushEvent('test');
        api.pushEvent('test2', {});
        expect(transport.items).toHaveLength(2);
        expect((transport.items[0] as TransportItem<EventEvent>).payload.attributes).toBeUndefined();
        expect((transport.items[0] as TransportItem<EventEvent>).payload.attributes).toBeUndefined();
      });
    });
  });

  describe('User action', () => {
    it('buffers the error if a user action is in progress', () => {
      const internalLogger = mockInternalLogger;
      const config = mockConfig();

      const api = initializeEventsAPI({
        unpatchedConsole: console,
        internalLogger,
        config,
        metas: mockMetas,
        transports: mockTransports,
        tracesApi: mockTracesApi,
        userActionsApi: mockUserActionsApi,
      });

      (mockUserActionsApi.getActiveUserAction as jest.Mock).mockReturnValueOnce(
        new UserAction({
          name: 'test',
          trigger: 'foo',
          transports: mockTransports,
          pushEvent: jest.fn(),
        })
      );
      api.pushEvent('test');
      expect(mockTransports.execute).not.toHaveBeenCalled();
    });
  });
});
