import type { ContextAPI as OTELContextAPI, TraceAPI as OTELTraceAPI } from '@opentelemetry/api';

import type { Metas } from '../../metas';
import { TransportItem, TransportItemType, Transports } from '../../transports';
import type { TraceContext, TraceEvent, TracesAPI } from './types';

export function initializeTraces(_transports: Transports, _metas: Metas): TracesAPI {
  let traceAPI: OTELTraceAPI | undefined;
  let contextAPI: OTELContextAPI | undefined;

  const getOTELTraceAPI = () => traceAPI;
  const getOTELContextAPI = () => contextAPI;

  const setOTELTraceAPI = (_traceAPI: OTELTraceAPI) => {
    traceAPI = _traceAPI;
  };

  const setOTELContextAPI = (_contextAPI: OTELContextAPI) => {
    contextAPI = _contextAPI;
  };

  const getTraceContext = (): TraceContext | undefined => {
    if (traceAPI && contextAPI) {
      const ctx = traceAPI.getSpan(contextAPI.active())?.spanContext();
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
