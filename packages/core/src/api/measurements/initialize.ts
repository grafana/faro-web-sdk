import type { Metas } from '../../metas';
import { TransportItem, TransportItemType } from '../../transports';
import type { Transports } from '../../transports';
import type { TracesAPI } from '../traces';
import type { MeasurementEvent, MeasurementsAPI } from './types';

export function initializeMeasurements(transports: Transports, metas: Metas, tracesApi: TracesAPI): MeasurementsAPI {
  const pushMeasurement: MeasurementsAPI['pushMeasurement'] = (payload) => {
    try {
      const item: TransportItem<MeasurementEvent> = {
        type: TransportItemType.MEASUREMENT,
        payload,
        meta: metas.value,
      };

      if (tracesApi.isInitialized()) {
        item.payload.trace = {
          // TODO: Fix this types
          trace_id: (tracesApi.getActiveSpan() as any).spanContext().traceId,
          span_id: (tracesApi.getActiveSpan() as any).spanContext().spanId,
        };
      }

      transports.execute(item);
    } catch (err) {
      // TODO: Add proper logging when debug is enabled
    }
  };

  return {
    pushMeasurement,
  };
}
