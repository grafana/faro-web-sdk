import type { Config } from '../../config';
import type { InternalLogger } from '../../internalLogger';
import type { Metas } from '../../metas';
import { TransportItemType } from '../../transports';
import type { TransportItem, Transports } from '../../transports';
import type { UnpatchedConsole } from '../../unpatchedConsole';
import { deepEqual, getCurrentTimestamp, isEmpty, isNull, stringifyObjectValues } from '../../utils';
import { timestampToIsoString } from '../../utils/date';
import { USER_ACTION_START } from '../const';
import type { ItemBuffer } from '../ItemBuffer';
import type { TracesAPI } from '../traces';
import type { ApiMessageBusMessages } from '../types';

import type { MeasurementEvent, MeasurementsAPI } from './types';

export function initializeMeasurementsAPI({
  internalLogger,
  config,
  metas,
  transports,
  tracesApi,
  actionBuffer,
  getMessage,
}: {
  unpatchedConsole: UnpatchedConsole;
  internalLogger: InternalLogger;
  config: Config;
  metas: Metas;
  transports: Transports;
  tracesApi: TracesAPI;
  actionBuffer: ItemBuffer<TransportItem>;
  getMessage: () => ApiMessageBusMessages | undefined;
}): MeasurementsAPI {
  internalLogger.debug('Initializing measurements API');

  let lastPayload: Pick<MeasurementEvent, 'type' | 'values' | 'context'> | null = null;

  const pushMeasurement: MeasurementsAPI['pushMeasurement'] = (
    payload,
    { skipDedupe, context, spanContext, timestampOverwriteMs } = {}
  ) => {
    try {
      const ctx = stringifyObjectValues(context);

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
          context: isEmpty(ctx) ? undefined : ctx,
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

      const msg = getMessage();
      if (msg && msg.type === USER_ACTION_START) {
        actionBuffer.addItem(item);
      } else {
        transports.execute(item);
      }
    } catch (err) {
      internalLogger.error('Error pushing measurement\n', err);
    }
  };

  return {
    pushMeasurement,
  };
}
