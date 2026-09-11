import type { ContextAPI as OTELContextAPI, TraceAPI as OTELTraceAPI } from '@opentelemetry/api';
import type { IResourceSpans } from '@opentelemetry/otlp-transformer/build/src/trace/internal-types';

import type { Meta } from '../../metas';

export interface TraceEvent {
  resourceSpans?: IResourceSpans[];
}

export interface OTELApi {
  trace: OTELTraceAPI;
  context: OTELContextAPI;
}

export interface TracesAPI {
  getOTEL: () => OTELApi | undefined;
  getTraceContext: () => TraceContext | undefined;
  initOTEL: (trace: OTELTraceAPI, context: OTELContextAPI) => void;
  isOTELInitialized: () => boolean;
  /** Pass captured metadata when spans already have ownership established at span start. */
  pushTraces: (traces: TraceEvent, options?: { meta?: Meta }) => void;
}

// trace context for logs, exceptions, measurements
export interface TraceContext {
  trace_id: string;
  span_id: string;
}
