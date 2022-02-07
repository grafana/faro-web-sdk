import type { Metas } from '../../metas';
import type { TransportItem, Transports } from '../../transports';
import { TransportItemType } from '../../transports';
import { getCurrentTimestamp } from '../../utils';
import { defaultExceptionType } from './const';
import type { ExceptionEvent, ExceptionsAPI } from './types';

export function initializeExceptions(transports: Transports, metas: Metas): ExceptionsAPI {
  const pushException: ExceptionsAPI['pushException'] = (value, type = defaultExceptionType, stackFrames = []) => {
    try {
      const item: TransportItem<ExceptionEvent> = {
        meta: metas.value,
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
