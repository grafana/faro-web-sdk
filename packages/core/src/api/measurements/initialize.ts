import type { Config } from '../../config';
import type { InternalLogger } from '../../internalLogger';
import type { Metas } from '../../metas';
import { TransportItem, TransportItemType } from '../../transports';
import type { Transports } from '../../transports';
import type { UnpatchedConsole } from '../../unpatchedConsole';
import { deepEqual, getCurrentTimestamp, isNull } from '../../utils';
import type { TracesAPI } from '../traces';

import type { MeasurementEvent, MeasurementsAPI } from './types';

export function initializeMeasurementsAPI(
  _unpatchedConsole: UnpatchedConsole,
  internalLogger: InternalLogger,
  config: Config,
  metas: Metas,
  transports: Transports,
  tracesApi: TracesAPI
): MeasurementsAPI {
  internalLogger.debug('Initializing measurements API');

  let lastPayload: Pick<MeasurementEvent, 'type' | 'values'> | null = null;

  const pushMeasurement: MeasurementsAPI['pushMeasurement'] = (payload, { skipDedupe } = {}) => {
    try {
      const item: TransportItem<MeasurementEvent> = {
        type: TransportItemType.MEASUREMENT,
        payload: {
          ...payload,
          trace: tracesApi.getTraceContext(),
          timestamp: payload.timestamp ?? getCurrentTimestamp(),
        },
        meta: metas.value,
      };

      const testingPayload = {
        type: item.payload.type,
        values: item.payload.values,
      };

      if (!skipDedupe && config.dedupe && !isNull(lastPayload) && deepEqual(testingPayload, lastPayload)) {
        internalLogger.debug('Skipping measurement push because it is the same as the last one\n', item.payload);

        return;
      }

      lastPayload = testingPayload;

      internalLogger.debug('Pushing measurement\n', item);

      transports.execute(item);
    } catch (err) {
      internalLogger.error('Error pushing measurement\n', err);
    }
  };

  return {
    pushMeasurement,
  };
}
