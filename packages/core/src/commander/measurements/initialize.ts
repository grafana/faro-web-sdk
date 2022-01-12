import type { Meta } from '../../meta';
import { TransportItemType } from '../../transports';
import type { Transports } from '../../transports';
import { getCurrentTimestamp } from '../../utils';
import type { Commands } from './commands';

export function initialize(transports: Transports, meta: Meta): Commands {
  const pushMeasurement: Commands['pushMeasurement'] = (payload) => {
    transports.execute({
      type: TransportItemType.MEASUREMENTS,
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
