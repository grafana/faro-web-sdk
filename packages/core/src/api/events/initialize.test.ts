import { TransportItemType, UserActionState } from '../..';
import type { TransportItem, UserActionInternalInterface } from '../..';
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

      it('keeps the triggering event as the dedupe key after nested lifecycle emission', () => {
        const target = new MockTransport();
        const { api, metas } = initializeFaro(mockConfig({ transports: [target] }));
        metas.addCaptureListener!(() => api.pushEvent('session-transition'));

        api.pushEvent('trigger');
        api.pushEvent('trigger');

        expect(target.items.map((item) => (item.payload as EventEvent).name)).toEqual([
          'session-transition',
          'trigger',
        ]);
      });

      it('deduplicates the same event emitted during capture', () => {
        const target = new MockTransport();
        const { api, metas } = initializeFaro(mockConfig({ transports: [target] }));
        metas.addCaptureListener!(() => api.pushEvent('same'));

        api.pushEvent('same');

        expect(target.items.map((item) => (item.payload as EventEvent).name)).toEqual(['same']);
      });

      it('does not consume the dedupe key when capture fails', () => {
        const target = new MockTransport();
        const { api, metas } = initializeFaro(mockConfig({ transports: [target] }));
        const fail = () => {
          throw new Error('capture failed');
        };
        metas.addCaptureListener!(fail);
        api.pushEvent('retry');
        expect(target.items).toEqual([]);
        metas.removeCaptureListener!(fail);

        api.pushEvent('retry');

        expect(target.items.map((item) => (item.payload as EventEvent).name)).toEqual(['retry']);
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

  describe('Skipping the user action buffer', () => {
    it.each([undefined, { name: 'earlier', parentId: 'earlier-id' }])(
      'sends the captured ownership immediately (%s) and still buffers the next ordinary event',
      (capturedAction) => {
        const [api, transport] = createAPI();
        const laterAction = api.startUserAction('later') as UserActionInternalInterface;
        api.pushEvent('delayed-request', {}, undefined, {
          skipUserActionBuffer: true,
          customPayloadTransformer: (payload) => ({ ...payload, action: capturedAction }),
        });
        expect(transport.items).toHaveLength(1);
        expect((transport.items[0]?.payload as EventEvent).action).toEqual(capturedAction);
        expect(laterAction.getState()).toBe(UserActionState.Started);

        api.pushEvent('ordinary');
        expect(transport.items).toHaveLength(1);
        laterAction.end();
        const ordinary = transport.items.find((item) => (item.payload as EventEvent).name === 'ordinary');
        expect((ordinary?.payload as EventEvent).action).toEqual({ name: 'later', parentId: laterAction.parentId });
      }
    );

    it.each([
      [false, true, false],
      [true, false, true],
    ])('shares deduplication across buffered and opted-out events (%s, %s, %s)', (...skipBuffer) => {
      const [api, transport] = createAPI();
      const action = api.startUserAction('active') as UserActionInternalInterface;
      ['first', 'different', 'first'].forEach((name, index) => {
        api.pushEvent(name, {}, undefined, { skipUserActionBuffer: skipBuffer[index] });
      });
      action.end();
      expect(transport.items.filter((item) => (item.payload as EventEvent).name === 'first')).toHaveLength(2);
      expect(transport.items.filter((item) => (item.payload as EventEvent).name === 'different')).toHaveLength(1);
    });

    it('still deduplicates consecutive opted-out events', () => {
      const [api, transport] = createAPI();
      api.startUserAction('active');
      api.pushEvent('same', {}, undefined, { skipUserActionBuffer: true });
      api.pushEvent('same', {}, undefined, { skipUserActionBuffer: true });
      expect(transport.items).toHaveLength(1);
    });

    it.each(['hook', 'transport'] as const)('isolates a throwing %s from later opted-out events', (source) => {
      const transport = new MockTransport();
      const failFirst = (item: TransportItem) => {
        if (item.type === TransportItemType.EVENT && (item.payload as EventEvent).name === 'first') {
          throw new Error('synthetic failure');
        }
        return item;
      };
      if (source === 'transport') {
        const send = transport.send.bind(transport);
        transport.send = (items) => send(items.map(failFirst));
      }
      const { api } = initializeFaro(
        mockConfig({
          transports: [transport],
          ...(source === 'hook' ? { beforeSend: failFirst } : {}),
        })
      );
      api.startUserAction('active');
      for (const name of ['first', 'second', 'third']) {
        api.pushEvent(name, {}, undefined, { skipUserActionBuffer: true });
      }
      expect(transport.items.map((item) => (item.payload as EventEvent).name)).toEqual(['second', 'third']);
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
