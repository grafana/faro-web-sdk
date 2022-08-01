import type { InternalLogger } from '../../internalLogger';
import type { Metas } from '../../metas';
import { TransportItem, TransportItemType, Transports } from '../../transports';
import type { OTELApi, TraceContext, TraceEvent, TracesAPI } from './types';

export function initializeTracesAPI(internalLogger: InternalLogger, transports: Transports, metas: Metas): TracesAPI {
  let otel: OTELApi | undefined = undefined;

  const initOTEL: TracesAPI['initOTEL'] = (trace, context) => {
    otel = {
      trace,
      context,
    };
  };

  const getTraceContext: TracesAPI['getTraceContext'] = (): TraceContext | undefined => {
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

      internalLogger.debug('Pushing trace', item);

      transports.execute(item);
    } catch (err) {
      internalLogger.error('Error pushing trace', err);
    }
  };

  const getOTEL: TracesAPI['getOTEL'] = () => otel;

  return {
    getOTEL,
    getTraceContext,
    initOTEL,
    pushTraces,
  };
}
