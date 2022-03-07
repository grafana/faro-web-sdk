import type { Metas } from '../../metas';
import { TransportItemType } from '../../transports';
import type { TransportItem, Transports } from '../../transports';
import { getCurrentTimestamp } from '../../utils';
import { defaultExceptionType } from './const';
import type { ExceptionEvent, ExceptionsAPI } from './types';

export function initializeExceptions(transports: Transports, metas: Metas): ExceptionsAPI {
  const pushException: ExceptionsAPI['pushException'] = (value, { span, stackFrames, type } = {}) => {
    try {
      const item: TransportItem<ExceptionEvent> = {
        meta: metas.value,
        payload: {
          type: type ?? defaultExceptionType,
          value,
          timestamp: getCurrentTimestamp(),
        },
        type: TransportItemType.EXCEPTION,
      };

      if (span) {
        item.payload.trace = {
          trace_id: span.getTraceId(),
          span_id: span.getId(),
        };
      }

      if (stackFrames?.length) {
        item.payload.stacktrace = {
          frames: stackFrames,
        };
      }

      transports.execute(item);
    } catch (err) {
      // TODO: Add proper logging when debug is enabled
    }
  };

  return {
    pushException,
  };
}
