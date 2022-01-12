import type { Meta } from '../../meta';
import { TransportItemType } from '../../transports';
import type { Transports } from '../../transports';
import { getCurrentTimestamp } from '../../utils';
import type { Commands } from './commands';
import { defaultLevel } from './const';

export function initialize(transports: Transports, meta: Meta): Commands {
  const pushLog: Commands['pushLog'] = (args, level = defaultLevel, context = {}) => {
    try {
      transports.execute({
        type: TransportItemType.LOGS,
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
