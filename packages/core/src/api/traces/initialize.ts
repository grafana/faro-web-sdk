import type { ContextAPI as OTELContextAPI, TraceAPI as OTELTraceAPI } from '@opentelemetry/api';
import type { Metas } from '../../metas';
import { TransportItem, TransportItemType, Transports } from '../../transports';
import type { TraceContext, TraceEvent, TracesAPI } from './types';

interface OTELAPI {
  traceAPI?: OTELTraceAPI;
  contextAPI?: OTELContextAPI;
}

export function initializeTraces(_transports: Transports, _metas: Metas): TracesAPI {
  const otel: OTELAPI = {};

  const getOTELTraceAPI = () => otel.traceAPI;
  const getOTELContextAPI = () => otel.contextAPI;

  const setOTELTraceAPI = (_traceAPI: OTELTraceAPI) => {
    console.log('settraceapi', _traceAPI);
    otel.traceAPI = _traceAPI;
  };

  const setOTELContextAPI = (_contextAPI: OTELContextAPI) => {
    otel.contextAPI = _contextAPI;
  };

  const getTraceContext = (): TraceContext | undefined => {
    if (otel.traceAPI && otel.contextAPI) {
      const ctx = otel.traceAPI.getSpanContext(otel.contextAPI.active());
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

  return {
    getOTELContextAPI,
    getOTELTraceAPI,
    setOTELContextAPI,
    setOTELTraceAPI,
    pushTraces,
    getTraceContext,
  };
}
