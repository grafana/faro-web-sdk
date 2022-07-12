import type { InternalLogger } from '../../internalLogger';
import type { Metas } from '../../metas';
import { originalConsole } from '../../originalConsole';
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

      transports.execute(item);
    } catch (err) {
      internalLogger.error(err);
    }
  };

  const callOriginalConsoleMethod: LogsAPI['callOriginalConsoleMethod'] = (level, ...args) => {
    originalConsole[level].apply(console, args);
  };

  return {
    callOriginalConsoleMethod,
    pushLog,
  };
}
