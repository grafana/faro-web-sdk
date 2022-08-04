import type { InternalLogger } from '../../internalLogger';
import type { Metas } from '../../metas';
import { TransportItem, TransportItemType } from '../../transports';
import type { Transports } from '../../transports';
import type { TracesAPI } from '../traces';
import type { MeasurementEvent, MeasurementsAPI } from './types';

export function initializeMeasurementsAPI(
  internalLogger: InternalLogger,
  transports: Transports,
  metas: Metas,
  tracesApi: TracesAPI
): MeasurementsAPI {
  internalLogger.debug('Initializing measurements API');

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

      internalLogger.debug('Pushing measurement', item);

      transports.execute(item);
    } catch (err) {
      internalLogger.error('Error pushing measurement', err);
    }
  };

  return {
    pushMeasurement,
  };
}
