import type { Metas } from '../../metas';
import type { Transports } from '../../transports';
import type { GetActiveSpan, TracesAPI } from './types';

export function initializeTraces(_transports: Transports, _metas: Metas): TracesAPI {
  let tracer: unknown | null = null;
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

  return {
    getTracer,
    isInitialized,
    setTracer,
    setGetActiveSpanInternal,
    getActiveSpan,
  };
}
