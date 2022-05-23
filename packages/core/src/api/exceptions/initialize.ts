import type { Metas } from '../../metas';
import { TransportItemType } from '../../transports';
import type { TransportItem, Transports } from '../../transports';
import { getCurrentTimestamp } from '../../utils';
import type { TracesAPI } from '../traces';
import { defaultExceptionType } from './const';
import type { ExceptionEvent, ExceptionsAPI } from './types';

export function initializeExceptions(transports: Transports, metas: Metas, tracesApi: TracesAPI): ExceptionsAPI {
  const pushException: ExceptionsAPI['pushException'] = (value, { stackFrames, type } = {}) => {
    try {
      const item: TransportItem<ExceptionEvent> = {
        meta: metas.value,
        payload: {
          type: type ?? defaultExceptionType,
          value,
          timestamp: getCurrentTimestamp(),
          trace: tracesApi.getTraceContext(),
        },
        type: TransportItemType.EXCEPTION,
      };

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
