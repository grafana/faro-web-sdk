import type { Meta } from '../../meta/types';
import type { TransportItem, Transports } from '../../transports';
import { TransportItemType } from '../../transports';
import { getCurrentTimestamp } from '../../utils';
import { defaultExceptionType } from './const';
import type { ExceptionEvent, ExceptionsCommands } from './types';

export function initializeExceptions(transports: Transports, meta: Meta): ExceptionsCommands {
  const pushException: ExceptionsCommands['pushException'] = (value, type = defaultExceptionType, stackFrames = []) => {
    try {
      const item: TransportItem<ExceptionEvent> = {
        meta: meta.values,
        payload: {
          type,
          value,
          timestamp: getCurrentTimestamp(),
        },
        type: TransportItemType.EXCEPTION,
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
