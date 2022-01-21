import type { Meta } from '../../meta';
import type { TransportItem, Transports } from '../../transports';
import { TransportItemType } from '../../transports';
import { getCurrentTimestamp } from '../../utils';
import { defaultExceptionType } from './const';
import type { ExceptionEvent, ExceptionsAPI } from './types';

export function initializeExceptions(transports: Transports, meta: Meta): ExceptionsAPI {
  const pushException: ExceptionsAPI['pushException'] = (value, type = defaultExceptionType, stackFrames = []) => {
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
