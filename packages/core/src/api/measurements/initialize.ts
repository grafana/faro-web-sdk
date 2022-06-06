import type { Metas } from '../../metas';
import { TransportItem, TransportItemType } from '../../transports';
import type { Transports } from '../../transports';
import type { TracesAPI } from '../traces';
import type { MeasurementEvent, MeasurementsAPI } from './types';

export function initializeMeasurementsAPI(transports: Transports, metas: Metas, tracesApi: TracesAPI): MeasurementsAPI {
  const pushMeasurement: MeasurementsAPI['pushMeasurement'] = (payload) => {
    try {
      const item: TransportItem<MeasurementEvent> = {
        type: TransportItemType.MEASUREMENT,
        payload: {
          ...payload,
          trace: tracesApi.getTraceContext(),
        },
        meta: metas.value,
      };

      transports.execute(item);
    } catch (err) {
      // TODO: Add proper logging when debug is enabled
    }
  };

  return {
    pushMeasurement,
  };
}
