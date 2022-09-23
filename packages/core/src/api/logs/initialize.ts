import type { Config } from '../../config';
import type { InternalLogger } from '../../internalLogger';
import type { Metas } from '../../metas';
import { TransportItem, TransportItemType } from '../../transports';
import type { Transports } from '../../transports';
import { deepEqual, defaultLogLevel, getCurrentTimestamp, isNull } from '../../utils';
import type { TracesAPI } from '../traces';
import type { LogEvent, LogsAPI } from './types';

export function initializeLogsAPI(
  internalLogger: InternalLogger,
  config: Config,
  transports: Transports,
  metas: Metas,
  tracesApi: TracesAPI
): LogsAPI {
  internalLogger.debug('Initializing logs API');

  let lastPayload: Pick<LogEvent, 'message' | 'level' | 'context'> | null = null;

  const pushLog: LogsAPI['pushLog'] = (args, { context, level, forcePush } = {}) => {
    try {
      const item: TransportItem<LogEvent> = {
        type: TransportItemType.LOG,
        payload: {
          message: args
            .map((arg) => {
              try {
                return String(arg);
              } catch (err) {
                return '';
              }
            })
            .join(' '),
          level: level ?? defaultLogLevel,
          context: context ?? {},
          timestamp: getCurrentTimestamp(),
          trace: tracesApi.getTraceContext(),
        },
        meta: metas.value,
      };

      const testingPayload = {
        message: item.payload.message,
        level: item.payload.level,
        context: item.payload.context,
      };

      if (!forcePush && config.dedupe && !isNull(lastPayload) && deepEqual(testingPayload, lastPayload)) {
        internalLogger.debug('Skipping log push because it is the same as the last one\n', item.payload);

        return;
      }

      lastPayload = testingPayload;

      internalLogger.debug('Pushing log\n', item);

      transports.execute(item);
    } catch (err) {
      internalLogger.error('Error pushing log\n', err);
    }
  };

  return {
    pushLog,
  };
}
