import type { Tracer } from '@opentelemetry/api';

import type { Metas } from '../../metas';
import { TransportItem, TransportItemType, Transports } from '../../transports';
import type { GetActiveSpan, TraceEvent, TracesAPI } from './types';

export function initializeTraces(_transports: Transports, _metas: Metas): TracesAPI {
  let tracer: Tracer | undefined;
  let getActiveSpanInternal: GetActiveSpan = () => {
    throw new Error('Tracer is not initialized');
  };

  const getTracer: TracesAPI['getTracer'] = () => tracer;

  const isInitialized: TracesAPI['isInitialized'] = () => tracer !== null;

  const setTracer: TracesAPI['setTracer'] = (newTracer) => {
    // TODO: add check if tracer is already set

    tracer = newTracer;
  };

  const getActiveSpan: TracesAPI['getActiveSpan'] = () => {
    return getActiveSpanInternal();
  };

  const setGetActiveSpanInternal: TracesAPI['setGetActiveSpanInternal'] = (newGetActiveSpanInternal) => {
    getActiveSpanInternal = newGetActiveSpanInternal;
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
    getTracer,
    isInitialized,
    setTracer,
    setGetActiveSpanInternal,
    getActiveSpan,
    pushTraces,
  };
}
