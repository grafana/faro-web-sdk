import { initializeFaro } from '../../initialize';
import { mockConfig, mockInternalLogger, MockTransport } from '../../testUtils';
import { TransportItem, TransportItemType } from '../../transports';
import { mockMetas, mockTracesApi, mockTransports, mockUserActionsApi } from '../apiTestHelpers';
import type { API } from '../types';
import UserAction from '../userActions/userAction';

import { initializeExceptionsAPI } from './initialize';
import type { ExceptionEvent, ExceptionEventExtended, ExceptionStackFrame, PushErrorOptions } from './types';

describe('api.exceptions', () => {
  function createAPI({ dedupe }: { dedupe: boolean } = { dedupe: true }): [API, MockTransport] {
    const transport = new MockTransport();
    const config = mockConfig({
      dedupe,
      transports: [transport],
    });

    const { api } = initializeFaro(config);

    return [api, transport];
  }

  describe('pushError', () => {
    let api: API;
    let transport: MockTransport;

    beforeEach(() => {
      [api, transport] = createAPI();
    });

    it('error with overrides', () => {
      const frames: ExceptionStackFrame[] = [
        {
          filename: 'foo.js',
          function: 'FooFn',
          colno: 4,
          lineno: 23,
        },
        {
          filename: 'bar.js',
          function: 'BarFn',
          colno: 6,
          lineno: 52,
        },
      ];

      const additionalContext = {
        message: 'React error boundary',
        componentStackTrace: 'componentStackTrace',
      };

      api.pushError(new Error('test exception'), {
        stackFrames: frames,
        type: 'TestError',
        context: additionalContext,
      });

      expect(transport.items).toHaveLength(1);

      const payload = transport.items[0];
      expect(payload?.payload).toBeTruthy();
      expect(payload?.type).toEqual(TransportItemType.EXCEPTION);

      const evt = payload?.payload as ExceptionEvent;
      expect(evt.type).toEqual('TestError');
      expect(evt.value).toEqual('test exception');
      expect(evt.stacktrace).toEqual({ frames });
      expect(evt.context).toEqual(additionalContext);
    });

    it('error without overrides', () => {
      const err = new Error('test');
      api.pushError(err);
      expect(transport.items).toHaveLength(1);

      const payload = transport.items[0];
      expect(payload?.meta.app?.name).toEqual('test');
      expect(payload?.payload).toBeTruthy();
      expect(payload?.type).toEqual(TransportItemType.EXCEPTION);

      const evt = payload?.payload as ExceptionEvent;
      expect(evt.type).toEqual('Error');
      expect(evt.value).toEqual('test');
      expect(evt.timestamp).toBeTruthy();

      const stacktrace = evt.stacktrace;
      expect(stacktrace).toBeTruthy();
      expect(stacktrace?.frames.length).toBeGreaterThan(3);
      expect(stacktrace?.frames[0]?.filename).toEqual('Error: test');
    });

    it('does not stringify empty context', () => {
      api.pushError(new Error('test'));
      api.pushError(new Error('test2'), {
        context: {},
      });
      expect(transport.items).toHaveLength(2);
      expect((transport.items[0] as TransportItem<ExceptionEvent>).payload.context).toBeUndefined();
      expect((transport.items[0] as TransportItem<ExceptionEvent>).payload.context).toBeUndefined();
    });

    it('add the original error to the payload', () => {
      const transport = new MockTransport();
      const config = mockConfig({
        transports: [transport],
        preserveOriginalError: true,
      });

      const { api } = initializeFaro(config);

      const error = new Error('test');
      api.pushError(error, { originalError: error });

      expect(transport.items).toHaveLength(1);
      expect((transport.items[0]?.payload as ExceptionEventExtended).originalError).toEqual(error);
    });

    describe('Filtering', () => {
      it('filters the same event', () => {
        const error = new Error('test');

        api.pushError(error);
        expect(transport.items).toHaveLength(1);

        api.pushError(error);
        expect(transport.items).toHaveLength(1);
      });

      it("doesn't filter events with same message and different stacktrace", () => {
        const error1 = new Error('test');
        const error2 = new Error('test');

        api.pushError(error1);
        expect(transport.items).toHaveLength(1);

        api.pushError(error2);
        expect(transport.items).toHaveLength(2);
      });

      it("doesn't filter events with other message and same stacktrace", () => {
        const error = new Error('test');

        api.pushError(error);
        expect(transport.items).toHaveLength(1);

        error.message = 'test2';
        api.pushError(error);
        expect(transport.items).toHaveLength(2);
      });

      it("doesn't filter events with same message and same stacktrace but different type", () => {
        const error = new Error('test');

        api.pushError(error);
        expect(transport.items).toHaveLength(1);

        error.name = 'Another Type';
        api.pushError(error);
        expect(transport.items).toHaveLength(2);
      });

      it("filters an event and doesn't filter the next different one", () => {
        const error = new Error('test');

        api.pushError(error);
        expect(transport.items).toHaveLength(1);

        api.pushError(error);
        expect(transport.items).toHaveLength(1);

        error.name = 'Another Type';
        api.pushError(error);
        expect(transport.items).toHaveLength(2);
      });

      it("doesn't filter when dedupe is false", () => {
        [api, transport] = createAPI({ dedupe: false });

        const error = new Error('test');

        api.pushError(error);
        expect(transport.items).toHaveLength(1);

        api.pushError(error);
        expect(transport.items).toHaveLength(2);
      });

      it("doesn't filter when skipDedupe is true", () => {
        const error = new Error('test');

        api.pushError(error);
        expect(transport.items).toHaveLength(1);

        api.pushError(error, {
          skipDedupe: true,
        });
        expect(transport.items).toHaveLength(2);
      });

      it("doesn't filter events with same message, same stacktrace, same type but different context", () => {
        const error = new Error('test');

        api.pushError(error, { context: { foo: 'bar' } });
        expect(transport.items).toHaveLength(1);

        api.pushError(error, { context: { bar: 'baz' } });
        expect(transport.items).toHaveLength(2);
      });

      it('uses traceId and spanId from custom context', () => {
        const spanContext: PushErrorOptions['spanContext'] = {
          traceId: 'my-trace-id',
          spanId: 'my-span-id',
        };

        const error = new Error('test');

        api.pushError(error, { spanContext });
        expect(transport.items).toHaveLength(1);
        expect((transport.items[0]?.payload as ExceptionEvent).trace).toStrictEqual({
          trace_id: 'my-trace-id',
          span_id: 'my-span-id',
        });
      });

      it('Sets the timestamp to the provided custom timestamp', () => {
        api.pushEvent('test', undefined, undefined, { timestampOverwriteMs: 123 });
        expect(transport.items).toHaveLength(1);
        expect((transport.items[0]?.payload as ExceptionEvent).timestamp).toBe('1970-01-01T00:00:00.123Z');
      });

      it('Adds error cause to error context', () => {
        const error = new Error('test', { cause: 'foo' });
        const error2 = new Error('test2', { cause: [1, 3] });
        const error3 = new Error('test3', { cause: { a: 'b' } });
        const error4 = new Error('test4', { cause: new Error('original error') });
        const error5 = new Error('test5', { cause: null });
        const error6 = new Error('test6', { cause: undefined });
        const error7 = new Error('test6');

        api.pushError(error);
        api.pushError(error2);
        api.pushError(error3);
        api.pushError(error4);
        api.pushError(error5);
        api.pushError(error6);
        api.pushError(error7);

        expect(transport.items).toHaveLength(7);

        expect((transport.items[0]?.payload as ExceptionEvent)?.context).toEqual({ cause: 'foo' });
        expect((transport.items[1]?.payload as ExceptionEvent)?.context).toEqual({ cause: '[1,3]' });
        expect((transport.items[2]?.payload as ExceptionEvent)?.context).toEqual({ cause: '{"a":"b"}' });
        expect((transport.items[3]?.payload as ExceptionEvent)?.context).toEqual({ cause: 'Error: original error' });
        expect((transport.items[4]?.payload as ExceptionEvent)?.context).toBeUndefined();
        expect((transport.items[5]?.payload as ExceptionEvent)?.context).toBeUndefined();
        expect((transport.items[6]?.payload as ExceptionEvent)?.context).toBeUndefined();
      });

      it('stringifies all values added to the context', () => {
        api.pushError(new Error('Error with context'), {
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

        const context = (transport.items[0]?.payload as ExceptionEvent)?.context;
        expect(context).toStrictEqual({
          a: '1',
          b: 'foo',
          c: 'true',
          d: '{"e":"bar"}',
          g: 'null',
          h: 'undefined',
          i: '[1,2,3]',
        });

        Object.values(context ?? {}).forEach((value) => {
          expect(typeof value).toBe('string');
        });
      });
    });

    describe('config.ignoreErrors', () => {
      it('will filter out errors by string or regex', () => {
        const transport = new MockTransport();

        const { api } = initializeFaro(
          mockConfig({
            transports: [transport],
            ignoreErrors: ['Error: ResizeObserver', /FetchError[:\s\w\/]*pwc/, 'chrome-extension://mock-extension-id'],
          })
        );

        api.pushError(new Error('Error: ResizeObserver loop limit exceeded'));
        api.pushError(new Error('FetchError: 404 \n  Instantiating https://pwc.grafana.net/public/react-router-dom'));
        api.pushError(new Error('FetchError: 404 \n  Instantiating https://pwc.grafana.net/public/@emotion/css'));

        const typeErrorMsg = 'TypeError: _.viz is undefined';
        api.pushError(new Error(typeErrorMsg));

        const mockErrorWithStacktrace = new Error('Mock error for testing');
        mockErrorWithStacktrace.name = 'MockError';
        mockErrorWithStacktrace.stack = `MockError: Mock error for testing
    at mockFunction (chrome-extension://mock-extension-id/mock-file.js:10:15)
    at anotherFunction (chrome-extension://mock-extension-id/mock-file.js:20:5)
    at Object.<anonymous> (chrome-extension://mock-extension-id/mock-file.js:30:3)`;
        api.pushError(mockErrorWithStacktrace);

        expect(transport.items).toHaveLength(1);
        expect((transport.items[0]?.payload as ExceptionEvent).value).toEqual(typeErrorMsg);
      });
    });
  });

  describe('User action', () => {
    it('buffers the error if a user action is in progress', () => {
      const internalLogger = mockInternalLogger;
      const config = mockConfig();

      const api = initializeExceptionsAPI({
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
      api.pushError(new Error('test'));
      expect(mockTransports.execute).not.toHaveBeenCalled();
    });
  });
});
