import type { Meta } from '../../meta/types';
import { TransportItemType } from '../../transports';
import type { Transports } from '../../transports';
import { getCurrentTimestamp } from '../../utils';
import { defaultLogLevel } from './const';
import type { LogsCommands } from './types';

export function initializeLogs(transports: Transports, meta: Meta): LogsCommands {
  const pushLog: LogsCommands['pushLog'] = (args, level = defaultLogLevel, context = {}) => {
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
        meta: meta.values,
      });
    } catch (err) {}
  };

  return {
    pushLog,
  };
}
