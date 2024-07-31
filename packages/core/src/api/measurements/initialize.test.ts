import type { MeasurementEvent, PushMeasurementOptions } from '../..';
import { initializeFaro } from '../../initialize';
import { mockConfig, MockTransport } from '../../testUtils';
import type { API } from '../types';

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
      api.pushEvent('test', undefined, undefined, { timestampOverwriteMs: 123 });
      expect(transport.items).toHaveLength(1);
      expect((transport.items[0]?.payload as MeasurementEvent).timestamp).toBe('1970-01-01T00:00:00.123Z');
    });
  });
});
