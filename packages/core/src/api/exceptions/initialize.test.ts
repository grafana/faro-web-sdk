import { initializeFaro } from '../../initialize';
import { mockConfig, MockTransport } from '../../testUtils';
import { TransportItemType } from '../../transports';
import type { API } from '../types';

import type { ExceptionEvent, ExceptionStackFrame } from './types';

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

      api.pushError(new Error('test exception'), {
        stackFrames: frames,
        type: 'TestError',
      });

      expect(transport.items).toHaveLength(1);

      const payload = transport.items[0];
      expect(payload?.payload).toBeTruthy();
      expect(payload?.type).toEqual(TransportItemType.EXCEPTION);

      const evt = payload?.payload as ExceptionEvent;
      expect(evt.type).toEqual('TestError');
      expect(evt.value).toEqual('test exception');
      expect(evt.stacktrace).toEqual({ frames });
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
    });
  });
});
