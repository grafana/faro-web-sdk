import type { Metas } from '../../metas';
import { TransportItem, TransportItemType } from '../../transports';
import type { Transports } from '../../transports';
import type { MeasurementEvent, MeasurementsAPI } from './types';

export function initializeMeasurements(transports: Transports, metas: Metas): MeasurementsAPI {
  const pushMeasurement: MeasurementsAPI['pushMeasurement'] = (payload, { span } = {}) => {
    try {
      const item: TransportItem<MeasurementEvent> = {
        type: TransportItemType.MEASUREMENT,
        payload,
        meta: metas.value,
      };

      if (span) {
        item.payload.trace = {
          trace_id: span.getTraceId(),
          span_id: span.getId(),
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
