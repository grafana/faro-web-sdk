import type { Config } from '../../config';
import type { InternalLogger } from '../../internalLogger';
import type { Metas } from '../../metas';
import { TransportItem, TransportItemType, Transports } from '../../transports';
import type { UnpatchedConsole } from '../../unpatchedConsole';

import type { OTELApi, TraceEvent, TracesAPI } from './types';

export function initializeTracesAPI(
  _unpatchedConsole: UnpatchedConsole,
  internalLogger: InternalLogger,
  _config: Config,
  metas: Metas,
  transports: Transports
): TracesAPI {
  internalLogger.debug('Initializing traces API');

  let otel: OTELApi | undefined = undefined;

  const initOTEL: TracesAPI['initOTEL'] = (trace, context) => {
    internalLogger.debug('Initializing OpenTelemetry');

    otel = {
      trace,
      context,
    };
  };

  const getTraceContext: TracesAPI['getTraceContext'] = () => {
    const ctx = otel?.trace.getSpanContext(otel.context.active());

    return !ctx
      ? undefined
      : {
          trace_id: ctx.traceId,
          span_id: ctx.spanId,
        };
  };

  const pushTraces: TracesAPI['pushTraces'] = (payload) => {
    try {
      const item: TransportItem<TraceEvent> = {
        type: TransportItemType.TRACE,
        payload,
        meta: metas.value,
      };

      internalLogger.debug('Pushing trace\n', item);

      transports.execute(item);
    } catch (err) {
      internalLogger.error('Error pushing trace\n', err);
    }
  };

  const getOTEL: TracesAPI['getOTEL'] = () => otel;

  const isOTELInitialized: TracesAPI['isOTELInitialized'] = () => !!otel;

  return {
    getOTEL,
    getTraceContext,
    initOTEL,
    isOTELInitialized,
    pushTraces,
  };
}
