import type { Meta } from '../../meta/types';
import { TransportItemType } from '../../transports';
import type { Transports } from '../../transports';
import { getCurrentTimestamp } from '../../utils';
import type { MeasurementsCommands } from './types';

export function initializeMeasurements(transports: Transports, meta: Meta): MeasurementsCommands {
  const pushMeasurement: MeasurementsCommands['pushMeasurement'] = (payload) => {
    transports.execute({
      type: TransportItemType.MEASUREMENT,
      payload: {
        ...payload,
        timestamp: getCurrentTimestamp(),
      },
      meta: meta.values,
    });
  };

  return {
    pushMeasurement,
  };
}
