import { type MeasurementEvent, type PushMeasurementOptions, TransportItem } from '../..';
import { initializeFaro } from '../../initialize';
import { mockConfig, mockInternalLogger, MockTransport } from '../../testUtils';
import { mockMetas, mockTracesApi, mockTransports, mockUserActionsApi } from '../apiTestHelpers';
import type { API } from '../types';
import UserAction from '../userActions/userAction';

import { initializeMeasurementsAPI } from './initialize';

describe('api.measurements', () => {
  function createAPI({ dedupe }: { dedupe: boolean } = { dedupe: true }): [API, MockTransport] {
    const transport = new MockTransport();
    const config = mockConfig({
      dedupe,
      transports: [transport],
    });

    const { api } = initializeFaro(config);

    return [api, transport];
  }

  describe('pushMeasurement', () => {
    let api: API;
    let transport: MockTransport;

    beforeEach(() => {
      [api, transport] = createAPI();
    });

    describe('Filtering', () => {
      it('filters the same measurement', () => {
        const measurement = {
          type: 'custom',
          values: {
            a: 1,
          },
        };

        api.pushMeasurement(measurement);
        expect(transport.items).toHaveLength(1);

        api.pushMeasurement(measurement);
        expect(transport.items).toHaveLength(1);
      });

      it('filters the same measurement with the same context', () => {
        const measurement = {
          type: 'custom',
          values: {
            a: 1,
          },
        };

        const context = { foo: 'bar' };

        api.pushMeasurement(measurement, { context });
        expect(transport.items).toHaveLength(1);

        api.pushMeasurement(measurement, { context });
        expect(transport.items).toHaveLength(1);
      });

      it("doesn't filter events with different context", () => {
        const measurement = {
          type: 'custom',
          values: {
            a: 1,
          },
        };

        api.pushMeasurement(measurement, { context: { foo: 'bar' } });
        expect(transport.items).toHaveLength(1);

        api.pushMeasurement(measurement, { context: { bar: 'baz' } });
        expect(transport.items).toHaveLength(2);
      });

      it("doesn't filter measurements with same type and partially same values", () => {
        const measurement1 = {
          type: 'custom',
          values: {
            a: 1,
          },
        };

        const measurement2 = {
          ...measurement1,
          values: {
            ...measurement1.values,
            b: 2,
          },
        };

        api.pushMeasurement(measurement1);
        expect(transport.items).toHaveLength(1);

        api.pushMeasurement(measurement2);
        expect(transport.items).toHaveLength(2);
      });

      it("doesn't filter measurements with different type and same values", () => {
        const measurement1 = {
          type: 'custom',
          values: {
            a: 1,
          },
        };

        const measurement2 = {
          ...measurement1,
          type: 'web-vitals',
        };

        api.pushMeasurement(measurement1);
        expect(transport.items).toHaveLength(1);

        api.pushMeasurement(measurement2);
        expect(transport.items).toHaveLength(2);
      });

      it("filters a measurement and doesn't filter the next different one", () => {
        const measurement1 = {
          type: 'custom',
          values: {
            a: 1,
          },
        };

        const measurement2 = {
          ...measurement1,
          type: 'web-vitals',
        };

        api.pushMeasurement(measurement1);
        expect(transport.items).toHaveLength(1);

        api.pushMeasurement(measurement1);
        expect(transport.items).toHaveLength(1);

        api.pushMeasurement(measurement2);
        expect(transport.items).toHaveLength(2);
      });

      it("doesn't filter when dedupe is false", () => {
        [api, transport] = createAPI({ dedupe: false });

        const measurement = {
          type: 'custom',
          values: {
            a: 1,
          },
        };

        api.pushMeasurement(measurement);
        expect(transport.items).toHaveLength(1);

        api.pushMeasurement(measurement);
        expect(transport.items).toHaveLength(2);
      });

      it("doesn't filter when skipDedupe is true", () => {
        const measurement = {
          type: 'custom',
          values: {
            a: 1,
          },
        };

        api.pushMeasurement(measurement);
        expect(transport.items).toHaveLength(1);

        api.pushMeasurement(measurement, { skipDedupe: true });
        expect(transport.items).toHaveLength(2);
      });

      it('uses traceId and spanId from custom context', () => {
        const spanContext: PushMeasurementOptions['spanContext'] = {
          traceId: 'my-trace-id',
          spanId: 'my-span-id',
        };

        const measurement = {
          type: 'custom',
          values: {
            a: 1,
          },
        };

        api.pushMeasurement(measurement, { spanContext });
        expect(transport.items).toHaveLength(1);

        expect((transport.items[0]?.payload as MeasurementEvent).trace).toStrictEqual({
          trace_id: 'my-trace-id',
          span_id: 'my-span-id',
        });
      });
    });

    it('Sets the timestamp to the provided custom timestamp', () => {
      api.pushMeasurement(
        {
          type: 'custom',
          values: {
            a: 1,
          },
        },
        { timestampOverwriteMs: 123 }
      );
      expect(transport.items).toHaveLength(1);
      expect((transport.items[0]?.payload as MeasurementEvent).timestamp).toBe('1970-01-01T00:00:00.123Z');
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

    it('does not stringify empty context', () => {
      api.pushMeasurement(
        {
          type: 'custom',
          values: {},
        },
        {
          context: {},
        }
      );
      api.pushMeasurement({
        type: 'custom2',
        values: {},
      });
      expect(transport.items).toHaveLength(2);
      expect((transport.items[0] as TransportItem<MeasurementEvent>).payload.context).toBeUndefined();
      expect((transport.items[0] as TransportItem<MeasurementEvent>).payload.context).toBeUndefined();
    });
  });

  describe('User action', () => {
    it('buffers the measurement if a user action is in progress', () => {
      const internalLogger = mockInternalLogger;
      const config = mockConfig();

      const api = initializeMeasurementsAPI({
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
      api.pushMeasurement({ type: 'test', values: { a: 1 } });
      expect(mockTransports.execute).not.toHaveBeenCalled();
    });
  });
});
