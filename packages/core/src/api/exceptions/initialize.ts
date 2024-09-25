import type { Config } from '../../config';
import type { InternalLogger } from '../../internalLogger';
import type { Metas } from '../../metas';
import { TransportItemType } from '../../transports';
import type { TransportItem, Transports } from '../../transports';
import type { UnpatchedConsole } from '../../unpatchedConsole';
import { deepEqual, getCurrentTimestamp, isArray, isError, isNull, isObject } from '../../utils';
import { timestampToIsoString } from '../../utils/date';
import type { TracesAPI } from '../traces';

import { defaultExceptionType } from './const';
import type { ErrorWithIndexProperties, ExceptionEvent, ExceptionsAPI, StacktraceParser } from './types';

let stacktraceParser: StacktraceParser | undefined;

export function initializeExceptionsAPI(
  _unpatchedConsole: UnpatchedConsole,
  internalLogger: InternalLogger,
  config: Config,
  metas: Metas,
  transports: Transports,
  tracesApi: TracesAPI
): ExceptionsAPI {
  internalLogger.debug('Initializing exceptions API');

  let lastPayload: Pick<ExceptionEvent, 'type' | 'value' | 'stacktrace' | 'context'> | null = null;

  stacktraceParser = config.parseStacktrace ?? stacktraceParser;

  const changeStacktraceParser: ExceptionsAPI['changeStacktraceParser'] = (newStacktraceParser) => {
    internalLogger.debug('Changing stacktrace parser');

    stacktraceParser = newStacktraceParser ?? stacktraceParser;
  };

  const getStacktraceParser: ExceptionsAPI['getStacktraceParser'] = () => stacktraceParser;

  const pushError: ExceptionsAPI['pushError'] = (
    error,
    { skipDedupe, stackFrames, type, context, spanContext, timestampOverwriteMs } = {}
  ) => {
    type = type || error.name || defaultExceptionType;

    const item: TransportItem<ExceptionEvent> = {
      meta: metas.value,
      payload: {
        type,
        value: error.message,
        timestamp: timestampOverwriteMs ? timestampToIsoString(timestampOverwriteMs) : getCurrentTimestamp(),
        trace: spanContext
          ? {
              trace_id: spanContext.traceId,
              span_id: spanContext.spanId,
            }
          : tracesApi.getTraceContext(),
        context: {
          ...parseCause(error),
          ...(context ?? {}),
        },
      },
      type: TransportItemType.EXCEPTION,
    };

    stackFrames = stackFrames ?? (error.stack ? stacktraceParser?.(error).frames : undefined);

    if (stackFrames?.length) {
      item.payload.stacktrace = {
        frames: stackFrames,
      };
    }

    const testingPayload = {
      type: item.payload.type,
      value: item.payload.value,
      stackTrace: item.payload.stacktrace,
      context: item.payload.context,
    };

    if (!skipDedupe && config.dedupe && !isNull(lastPayload) && deepEqual(testingPayload, lastPayload)) {
      internalLogger.debug('Skipping error push because it is the same as the last one\n', item.payload);

      return;
    }

    lastPayload = testingPayload;

    internalLogger.debug('Pushing exception\n', item);

    transports.execute(item);
  };

  changeStacktraceParser(config.parseStacktrace);

  return {
    changeStacktraceParser,
    getStacktraceParser,
    pushError,
  };
}
function parseCause(error: ErrorWithIndexProperties): {} | { cause: string } {
  let cause = error.cause;

  if (isError(cause)) {
    cause = error.cause.toString();
    // typeof operator on null returns "object". This is a well-known quirk in JavaScript and is considered a bug that cannot be fixed due to backward compatibility issues.
    // MDN: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/typeof#typeof_null
  } else if (cause !== null && (isObject(error.cause) || isArray(error.cause))) {
    cause = JSON.stringify(error.cause);
  } else if (cause != null) {
    cause = error.cause.toString();
  }

  return cause == null ? {} : { cause };
}
