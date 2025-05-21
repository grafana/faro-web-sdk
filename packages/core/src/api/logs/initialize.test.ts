import { initializeFaro } from '../../initialize';
import { mockConfig, mockInternalLogger, MockTransport } from '../../testUtils';
import type { TransportItem } from '../../transports';
import { dateNow, LogLevel } from '../../utils';
import { mockMetas, mockTracesApi, mockTransports } from '../apiTestHelpers';
import { USER_ACTION_CANCEL, USER_ACTION_END, USER_ACTION_START } from '../const';
import { ItemBuffer } from '../ItemBuffer';
import type { API, APIEvent, ApiMessageBusMessages } from '../types';

import { initializeLogsAPI } from './initialize';
import type { LogArgsSerializer, LogEvent, PushLogOptions } from './types';

describe('api.logs', () => {
  function createAPI(
    { dedupe, logArgsSerializer }: { dedupe: boolean; logArgsSerializer?: LogArgsSerializer } = { dedupe: true }
  ): [API, MockTransport] {
    const transport = new MockTransport();
    const config = mockConfig({
      dedupe,
      transports: [transport],
      logArgsSerializer,
    });

    const { api } = initializeFaro(config);

    return [api, transport];
  }

  describe('pushLog', () => {
    let api: API;
    let transport: MockTransport;

    beforeEach(() => {
      [api, transport] = createAPI();
    });

    describe('Filtering', () => {
      it('filters the same event', () => {
        api.pushLog(['test']);
        expect(transport.items).toHaveLength(1);

        api.pushLog(['test']);
        expect(transport.items).toHaveLength(1);
      });

      it("doesn't filter events with partially same message", () => {
        api.pushLog(['test', 'another test']);
        expect(transport.items).toHaveLength(1);

        api.pushLog(['test']);
        expect(transport.items).toHaveLength(2);
      });

      it("doesn't filter events with same message and different level", () => {
        api.pushLog(['test']);
        expect(transport.items).toHaveLength(1);

        api.pushLog(['test'], {
          level: LogLevel.INFO,
        });
        expect(transport.items).toHaveLength(2);
      });

      it("doesn't filter events with same message and same level but different context", () => {
        api.pushLog(['test']);
        expect(transport.items).toHaveLength(1);

        api.pushLog(['test'], {
          context: {
            a: '1',
          },
        });
        expect(transport.items).toHaveLength(2);
      });

      it("filters an event and doesn't filter the next different one", () => {
        api.pushLog(['test']);
        expect(transport.items).toHaveLength(1);

        api.pushLog(['test']);
        expect(transport.items).toHaveLength(1);

        api.pushLog(['test'], {
          level: LogLevel.ERROR,
        });
        expect(transport.items).toHaveLength(2);
      });

      it("doesn't filter when dedupe is false", () => {
        [api, transport] = createAPI({ dedupe: false });

        api.pushLog(['test']);
        expect(transport.items).toHaveLength(1);

        api.pushLog(['test']);
        expect(transport.items).toHaveLength(2);
      });

      it("doesn't filter when skipDedupe is true", () => {
        api.pushLog(['test']);
        expect(transport.items).toHaveLength(1);

        api.pushLog(['test'], { skipDedupe: true });
        expect(transport.items).toHaveLength(2);
      });

      it('uses traceId and spanId from custom context', () => {
        const spanContext: PushLogOptions['spanContext'] = {
          traceId: 'my-trace-id',
          spanId: 'my-span-id',
        };

        api.pushLog(['test'], { spanContext });
        expect(transport.items).toHaveLength(1);

        expect((transport.items[0]?.payload as LogEvent).trace).toStrictEqual({
          trace_id: 'my-trace-id',
          span_id: 'my-span-id',
        });
      });
    });
    describe('Serializing', () => {
      it('serializes log arguments via String', () => {
        api.pushLog([1, 'test', { a: 1 }]);
        expect((transport.items[0]?.payload as LogEvent).message).toBe('1 test [object Object]');
      });

      it('uses custom logArgsSerializer', () => {
        const logArgsSerializer: LogArgsSerializer = (args) => JSON.stringify(args);

        [api, transport] = createAPI({ dedupe: true, logArgsSerializer });

        api.pushLog([1, 'test', { a: 1 }]);
        expect((transport.items[0]?.payload as LogEvent).message).toBe('[1,"test",{"a":1}]');
      });
    });

    it('Sets the timestamp to the provided custom timestamp', () => {
      api.pushLog(['test'], { timestampOverwriteMs: 123 });
      expect(transport.items).toHaveLength(1);
      expect((transport.items[0]?.payload as LogEvent).timestamp).toBe('1970-01-01T00:00:00.123Z');
    });

    it('stringifies all values in the context object', () => {
      api.pushLog(['test'], {
        context: {
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
        },
      });

      // @ts-expect-error
      expect(transport.items[0]?.payload.context).toStrictEqual({
        a: '1',
        b: 'foo',
        c: 'true',
        d: '{"e":"bar"}',
        g: 'null',
        h: 'undefined',
        i: '[1,2,3]',
      });
    });

    it('does not stringify empty context', () => {
      api.pushLog(['test']);
      api.pushLog(['test2'], {
        context: {},
      });
      expect(transport.items).toHaveLength(2);
      expect((transport.items[0] as TransportItem<LogEvent>).payload.context).toBeUndefined();
      expect((transport.items[0] as TransportItem<LogEvent>).payload.context).toBeUndefined();
    });
  });

  describe('User action', () => {
    it('buffers the error if a user action is in progress', () => {
      const internalLogger = mockInternalLogger;
      const config = mockConfig();

      const actionBuffer = new ItemBuffer<TransportItem<APIEvent>>();

      let message: ApiMessageBusMessages | undefined;

      const getMessage = () => message;

      message = { type: 'user-action-start', name: 'testAction', startTime: Date.now(), parentId: 'parent-id' };
      const api = initializeLogsAPI({
        unpatchedConsole: console,
        internalLogger,
        config,
        metas: mockMetas,
        transports: mockTransports,
        tracesApi: mockTracesApi,
        actionBuffer,
        getMessage,
      });

      api.pushLog(['test']);
      expect(actionBuffer.size()).toBe(1);

      message = {
        type: 'user-action-end',
        name: 'testAction',
        id: 'parent-id',
        startTime: dateNow(),
        endTime: dateNow(),
        duration: 0,
        eventType: 'click',
      };

      api.pushLog(['test-2']);
      expect(actionBuffer.size()).toBe(1);

      message = {
        type: 'user-action-cancel',
        name: 'testAction',
        parentId: 'parent-id',
      };

      api.pushLog(['test-3']);
      expect(actionBuffer.size()).toBe(1);
    });
  });

  describe('User action', () => {
    it('buffers the item if a user action is in progress', () => {
      const internalLogger = mockInternalLogger;
      const config = mockConfig();

      const actionBuffer = new ItemBuffer<TransportItem<APIEvent>>();

      let message: ApiMessageBusMessages | undefined;

      const getMessage = () => message;

      message = {
        type: USER_ACTION_START,
        name: 'testAction',
        startTime: Date.now(),
        parentId: 'parent-id',
      };
      const api = initializeLogsAPI({
        unpatchedConsole: console,
        internalLogger,
        config,
        metas: mockMetas,
        transports: mockTransports,
        tracesApi: mockTracesApi,
        actionBuffer,
        getMessage,
      });

      api.pushLog(['test']);
      expect(actionBuffer.size()).toBe(1);

      message = {
        type: USER_ACTION_END,
        name: 'testAction',
        id: 'parent-id',
        startTime: dateNow(),
        endTime: dateNow(),
        duration: 0,
        eventType: 'click',
      };

      api.pushLog(['test-2']);
      expect(actionBuffer.size()).toBe(1);

      message = {
        type: USER_ACTION_CANCEL,
        name: 'testAction',
        parentId: 'parent-id',
      };

      api.pushLog(['test-3']);
      expect(actionBuffer.size()).toBe(1);
    });
  });
});
