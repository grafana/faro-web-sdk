import { initializeFaro } from '../../initialize';
import { mockConfig, MockTransport } from '../../testUtils';
import type { API } from '../types';

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
    });
  });
});
