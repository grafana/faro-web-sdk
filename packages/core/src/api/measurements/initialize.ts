import type { Metas } from '../../metas';
import { TransportItemType } from '../../transports';
import type { Transports } from '../../transports';
import { getCurrentTimestamp } from '../../utils';
import type { MeasurementsAPI } from './types';

export function initializeMeasurements(transports: Transports, metas: Metas): MeasurementsAPI {
  const pushMeasurement: MeasurementsAPI['pushMeasurement'] = (payload) => {
    transports.execute({
      type: TransportItemType.MEASUREMENT,
      payload: {
        ...payload,
        timestamp: getCurrentTimestamp(),
      },
      meta: metas.value,
    });
  };

  return {
    pushMeasurement,
  };
}
