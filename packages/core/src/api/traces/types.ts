import type { Span, ContextAPI as OTELContextAPI, TraceAPI as OTELTraceAPI } from '@opentelemetry/api';
import type { IInstrumentationScope, IScopeSpans, IResourceSpans } from '@opentelemetry/otlp-transformer'

// @TODO in latest opentelemetry protobuf types "instrumentationLibrary" has been renamed to "scope"
// however on the grafana agent we use older otel collector that doesn't have this change.
// temporarily patching types to the old shape until grafana agent catches up to otel-collector >= 0.52
export interface TraceEvent {
  resourceSpans?: ResourceSpan[];
}
export type ResourceSpan = Omit<IResourceSpans, 'scopeSpans'> & {
  instrumentationLibrarySpans: InstrumentationLibrarySpan[];
}

export type InstrumentationLibrarySpan = Omit<IScopeSpans, 'scope'> & {
  instrumentationLibrary?: IInstrumentationScope;
}

export type GetActiveSpan = () => Span | undefined;

export type OTELApi = {
  trace: OTELTraceAPI;
  context: OTELContextAPI;
};

export interface TracesAPI {
  initOTEL: (trace: OTELTraceAPI, context: OTELContextAPI) => void;
  getOTEL: () => OTELApi | undefined;
  getTraceContext: () => TraceContext | undefined;
  pushTraces: (traces: TraceEvent) => void;
}

// trace context for logs, exceptions, measurements
export interface TraceContext {
  trace_id: string;
  span_id: string;
}
