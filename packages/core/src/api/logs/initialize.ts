import type { Metas } from '../../metas';
import { TransportItemType } from '../../transports';
import type { Transports } from '../../transports';
import { getCurrentTimestamp } from '../../utils';
import { defaultLogLevel, originalConsoleMethods } from './const';
import type { LogsAPI } from './types';

export function initializeLogs(transports: Transports, metas: Metas): LogsAPI {
  const pushLog: LogsAPI['pushLog'] = (args, level = defaultLogLevel, context = {}) => {
    try {
      transports.execute({
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
          level,
          context,
          timestamp: getCurrentTimestamp(),
        },
        meta: metas.value,
      });
    } catch (err) {}
  };

  const callOriginalConsoleMethod: LogsAPI['callOriginalConsoleMethod'] = (level, ...args) => {
    originalConsoleMethods[level].apply(console, args);
  };

  return {
    callOriginalConsoleMethod,
    pushLog,
  };
}
