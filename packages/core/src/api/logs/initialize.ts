import type { Config } from '../../config';
import type { InternalLogger } from '../../internalLogger';
import type { Metas } from '../../metas';
import { TransportItem, TransportItemType, Transports } from '../../transports';
import type { UnpatchedConsole } from '../../unpatchedConsole';
import { deepEqual, defaultLogLevel, getCurrentTimestamp, isEmpty, isNull, stringifyObjectValues } from '../../utils';
import { timestampToIsoString } from '../../utils/date';
import type { ItemBuffer } from '../ItemBuffer';
import type { TracesAPI } from '../traces';
import type { ApiMessageBusMessages } from '../types';

import { defaultLogArgsSerializer } from './const';
import type { LogEvent, LogsAPI } from './types';

export function initializeLogsAPI({
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
}): LogsAPI {
  internalLogger.debug('Initializing logs API');

  let lastPayload: Pick<LogEvent, 'message' | 'level' | 'context'> | null = null;

  const logArgsSerializer = config.logArgsSerializer ?? defaultLogArgsSerializer;

  const pushLog: LogsAPI['pushLog'] = (
    args,
    { context, level, skipDedupe, spanContext, timestampOverwriteMs } = {}
  ) => {
    try {
      const ctx = stringifyObjectValues(context);

      const item: TransportItem<LogEvent> = {
        type: TransportItemType.LOG,
        payload: {
          message: logArgsSerializer(args),
          level: level ?? defaultLogLevel,
          context: isEmpty(ctx) ? undefined : ctx,
          timestamp: timestampOverwriteMs ? timestampToIsoString(timestampOverwriteMs) : getCurrentTimestamp(),
          trace: spanContext
            ? {
                trace_id: spanContext.traceId,
                span_id: spanContext.spanId,
              }
            : tracesApi.getTraceContext(),
        },
        meta: metas.value,
      };

      const testingPayload = {
        message: item.payload.message,
        level: item.payload.level,
        context: item.payload.context,
      };

      if (!skipDedupe && config.dedupe && !isNull(lastPayload) && deepEqual(testingPayload, lastPayload)) {
        internalLogger.debug('Skipping log push because it is the same as the last one\n', item.payload);

        return;
      }

      lastPayload = testingPayload;

      internalLogger.debug('Pushing log\n', item);

      const msg = getMessage();
      if (msg && msg.type === 'user-action-start') {
        actionBuffer.addItem(item);
      } else {
        transports.execute(item);
      }
    } catch (err) {
      internalLogger.error('Error pushing log\n', err);
    }
  };

  return {
    pushLog,
  };
}
