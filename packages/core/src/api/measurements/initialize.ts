import type { Config } from '../../config';
import type { InternalLogger } from '../../internalLogger';
import type { Metas } from '../../metas';
import { TransportItem, TransportItemType } from '../../transports';
import type { Transports } from '../../transports';
import type { UnpatchedConsole } from '../../unpatchedConsole';
import { deepEqual, getCurrentTimestamp, isNull, stringifyObjectValues } from '../../utils';
import { timestampToIsoString } from '../../utils/date';
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

  let lastPayload: Pick<MeasurementEvent, 'type' | 'values' | 'context'> | null = null;

  const pushMeasurement: MeasurementsAPI['pushMeasurement'] = (
    payload,
    { skipDedupe, context, spanContext, timestampOverwriteMs } = {}
  ) => {
    try {
      const item: TransportItem<MeasurementEvent> = {
        type: TransportItemType.MEASUREMENT,
        payload: {
          ...payload,
          trace: spanContext
            ? {
                trace_id: spanContext.traceId,
                span_id: spanContext.spanId,
              }
            : tracesApi.getTraceContext(),
          timestamp: timestampOverwriteMs ? timestampToIsoString(timestampOverwriteMs) : getCurrentTimestamp(),
          context: stringifyObjectValues(context),
        },
        meta: metas.value,
      };

      const testingPayload = {
        type: item.payload.type,
        values: item.payload.values,
        context: item.payload.context,
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
