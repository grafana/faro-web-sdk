import type { Config } from '../../config';
import type { Metas } from '../../metas';
import { TransportItemType } from '../../transports';
import type { TransportItem, Transports } from '../../transports';
import { getCurrentTimestamp } from '../../utils';
import type { TracesAPI } from '../traces';
import { defaultExceptionType } from './const';
import type { ExceptionEvent, ExceptionsAPI, PushExceptionOptions } from './types';

export function initializeExceptionsAPI(
  config: Config,
  transports: Transports,
  metas: Metas,
  tracesApi: TracesAPI
): ExceptionsAPI {
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

  const pushError: ExceptionsAPI['pushError'] = (error) => {
    const message = error.message;
    const opts: PushExceptionOptions = {};
    if (error.name) {
      opts.type = error.name;
    }
    if (error.stack && config.parseStacktrace) {
      opts.stackFrames = config.parseStacktrace(error).frames;
    }

    return pushException(message, opts);
  };

  return {
    pushException,
    pushError,
  };
}
