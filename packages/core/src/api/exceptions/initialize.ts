import type { Config } from '../../config';
import type { InternalLogger } from '../../internalLogger';
import type { Metas } from '../../metas';
import { TransportItemType } from '../../transports';
import type { TransportItem, Transports } from '../../transports';
import { getCurrentTimestamp } from '../../utils';
import type { TracesAPI } from '../traces';
import { defaultExceptionType } from './const';
import type { ExceptionEvent, ExceptionsAPI } from './types';

export function initializeExceptionsAPI(
  internalLogger: InternalLogger,
  config: Config,
  transports: Transports,
  metas: Metas,
  tracesApi: TracesAPI
): ExceptionsAPI {
  const pushError: ExceptionsAPI['pushError'] = (error, options = {}) => {
    const type = options.type || error.name || defaultExceptionType;

    const stackFrames =
      options.stackFrames ?? (error.stack && config.parseStacktrace ? config.parseStacktrace(error).frames : undefined);

    const item: TransportItem<ExceptionEvent> = {
      meta: metas.value,
      payload: {
        type,
        value: error.message,
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

    internalLogger.debug('Pushing exception', item);

    transports.execute(item);
  };

  return {
    pushError,
  };
}
