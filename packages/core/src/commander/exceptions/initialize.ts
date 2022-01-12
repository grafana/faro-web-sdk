import type { Meta } from '../../meta';
import type { TransportItem, Transports } from '../../transports';
import { TransportItemType } from '../../transports';
import { getCurrentTimestamp } from '../../utils';
import type { Commands } from './commands';
import { defaultType } from './const';
import type { Event } from './event';

export function initialize(transports: Transports, meta: Meta): Commands {
  const pushException: Commands['pushException'] = (value, type = defaultType, stackFrames = []) => {
    try {
      const item: TransportItem<Event> = {
        meta: meta.values,
        payload: {
          type,
          value,
          timestamp: getCurrentTimestamp(),
        },
        type: TransportItemType.EXCEPTIONS,
      };

      if (stackFrames.length > 0) {
        item.payload.stacktrace = {
          frames: stackFrames,
        };
      }

      transports.execute(item);
    } catch (err) {}
  };

  return {
    pushException,
  };
}
