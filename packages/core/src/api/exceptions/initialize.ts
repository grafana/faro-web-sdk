import type { Config } from '../../config';
import type { InternalLogger } from '../../internalLogger';
import type { Metas } from '../../metas';
import { TransportItemType } from '../../transports';
import type { TransportItem, Transports } from '../../transports';
import { getCurrentTimestamp } from '../../utils';
import type { TracesAPI } from '../traces';
import { defaultExceptionType } from './const';
import type { ExceptionEvent, ExceptionsAPI, StacktraceParser } from './types';

let stacktraceParser: StacktraceParser | undefined;

export function initializeExceptionsAPI(
  internalLogger: InternalLogger,
  config: Config,
  transports: Transports,
  metas: Metas,
  tracesApi: TracesAPI
): ExceptionsAPI {
  internalLogger.debug('Initializing exceptions API');

  stacktraceParser = config.parseStacktrace ?? stacktraceParser;

  const changeStacktraceParser: ExceptionsAPI['changeStacktraceParser'] = (newStacktraceParser) => {
    internalLogger.debug('Changing stacktrace parser');

    stacktraceParser = newStacktraceParser ?? stacktraceParser;
  };

  const getStacktraceParser: ExceptionsAPI['getStacktraceParser'] = () => stacktraceParser;

  const pushError: ExceptionsAPI['pushError'] = (error, options = {}) => {
    const type = options.type || error.name || defaultExceptionType;

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

    const stackFrames = options.stackFrames ?? (error.stack ? stacktraceParser?.(error).frames : undefined);

    if (stackFrames?.length) {
      item.payload.stacktrace = {
        frames: stackFrames,
      };
    }

    internalLogger.debug('Pushing exception', item);

    transports.execute(item);
  };

  changeStacktraceParser(config.parseStacktrace);

  return {
    changeStacktraceParser,
    getStacktraceParser,
    pushError,
  };
}
