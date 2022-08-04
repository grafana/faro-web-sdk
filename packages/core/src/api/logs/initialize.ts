import type { InternalLogger } from '../../internalLogger';
import type { Metas } from '../../metas';
import { TransportItem, TransportItemType } from '../../transports';
import type { Transports } from '../../transports';
import { defaultLogLevel, getCurrentTimestamp } from '../../utils';
import type { TracesAPI } from '../traces';
import type { LogEvent, LogsAPI } from './types';

export function initializeLogsAPI(
  internalLogger: InternalLogger,
  transports: Transports,
  metas: Metas,
  tracesApi: TracesAPI
): LogsAPI {
  internalLogger.debug('Initializing logs API');

  const pushLog: LogsAPI['pushLog'] = (args, { context, level } = {}) => {
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

      internalLogger.debug('Pushing log', item);

      transports.execute(item);
    } catch (err) {
      internalLogger.error('Error pushing log', err);
    }
  };

  return {
    pushLog,
  };
}
