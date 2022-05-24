import type { ContextAPI as OTELContextAPI, TraceAPI as OTELTraceAPI } from '@opentelemetry/api';

import type { Metas } from '../../metas';
import { TransportItem, TransportItemType, Transports } from '../../transports';
import type { TraceContext, TraceEvent, TracesAPI } from './types';

export function initializeTraces(_transports: Transports, _metas: Metas): TracesAPI {
  let otel: TracesAPI['otel'] = undefined;

  const initOTEL = (trace: OTELTraceAPI, context: OTELContextAPI) => {
    otel = {
      trace,
      context,
    };
    bag.otel = otel;
  };

  const getTraceContext = (): TraceContext | undefined => {
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
        meta: _metas.value,
      };
      _transports.execute(item);
    } catch (err) {
      // TODO: Add proper logging when debug is enabled
    }
  };

  const bag: TracesAPI = {
    initOTEL,
    pushTraces,
    getTraceContext,
    otel,
  };

  return bag;
}
