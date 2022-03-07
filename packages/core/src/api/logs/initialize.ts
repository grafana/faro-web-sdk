import type { Metas } from '../../metas';
import { TransportItem, TransportItemType } from '../../transports';
import type { Transports } from '../../transports';
import { getCurrentTimestamp } from '../../utils';
import { defaultLogLevel, originalConsoleMethods } from './const';
import type { LogEvent, LogsAPI } from './types';

export function initializeLogs(transports: Transports, metas: Metas): LogsAPI {
  const pushLog: LogsAPI['pushLog'] = (args, { context, level, span } = {}) => {
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
        },
        meta: metas.value,
      };

      if (span) {
        item.payload.trace = {
          trace_id: span.getTraceId(),
          span_id: span.getId(),
        };
      }

      transports.execute(item);
    } catch (err) {
      // TODO: Add proper logging when debug is enabled
    }
  };

  const callOriginalConsoleMethod: LogsAPI['callOriginalConsoleMethod'] = (level, ...args) => {
    originalConsoleMethods[level].apply(console, args);
  };

  return {
    callOriginalConsoleMethod,
    pushLog,
  };
}
