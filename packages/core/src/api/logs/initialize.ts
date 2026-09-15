import type { Config } from '../../config';
import type { InternalLogger } from '../../internalLogger';
import { captureMetas, type Metas } from '../../metas';
import { TransportItemType } from '../../transports';
import type { TransportItem, Transports } from '../../transports';
import type { UnpatchedConsole } from '../../unpatchedConsole';
import { deepEqual, defaultLogLevel, getCurrentTimestamp, isEmpty, isNull, stringifyObjectValues } from '../../utils';
import { timestampToIsoString } from '../../utils/date';
import type { TracesAPI } from '../traces';
import type { UserActionsAPI } from '../userActions';
import { addItemToUserActionBuffer } from '../userActions/initialize';

import { defaultLogArgsSerializer } from './const';
import type { LogEvent, LogsAPI } from './types';

export function initializeLogsAPI({
  internalLogger,
  config,
  metas,
  transports,
  tracesApi,
  userActionsApi,
}: {
  unpatchedConsole: UnpatchedConsole;
  internalLogger: InternalLogger;
  config: Config;
  metas: Metas;
  transports: Transports;
  tracesApi: TracesAPI;
  userActionsApi: UserActionsAPI;
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

      const payload: LogEvent = {
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
      };

      const testingPayload = {
        message: payload.message,
        level: payload.level,
        context: payload.context,
      };

      if (!skipDedupe && config.dedupe && !isNull(lastPayload) && deepEqual(testingPayload, lastPayload)) {
        internalLogger.debug('Skipping log push because it is the same as the last one\n', payload);

        return;
      }

      const previousPayload = lastPayload;
      const meta = captureMetas(metas);
      if (lastPayload !== previousPayload && !skipDedupe && config.dedupe && deepEqual(testingPayload, lastPayload)) {
        return;
      }
      lastPayload = testingPayload;
      const item: TransportItem<LogEvent> = {
        type: TransportItemType.LOG,
        payload,
        meta,
      };

      internalLogger.debug('Pushing log\n', item);

      if (!addItemToUserActionBuffer(userActionsApi.getActiveUserAction(), item)) {
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
