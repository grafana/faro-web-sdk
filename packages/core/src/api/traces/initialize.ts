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
    if (otel) {
      const ctx = otel.trace.getSpanContext(otel.context.active());

      if (ctx) {
        return {
          trace_id: ctx.traceId,
          span_id: ctx.spanId,
        };
      }
    }

    return undefined;
  };

  const pushTraces: TracesAPI['pushTraces'] = (request) => {
    try {
      const item: TransportItem<TraceEvent> = {
        type: TransportItemType.TRACE,
        payload: request,
        meta: metas.value,
      };

      transports.execute(item);
    } catch (err) {
      internalLogger.error(err);
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
