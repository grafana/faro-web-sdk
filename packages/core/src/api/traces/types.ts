import type { ContextAPI as OTELContextAPI, TraceAPI as OTELTraceAPI } from '@opentelemetry/api';
import type { IResourceSpans } from '@opentelemetry/otlp-transformer';

// TODO: Revert temporary patching
// in latest OpenTelemetry packages protobuf type "instrumentationLibrary" has been renamed to "scope"
// however on the Grafana Agent we use older OTel collector that doesn't have this change
// temporarily patching types to the old shape until Grafana Agent catches up to otel-collector >= 0.52
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
  pushTraces: (traces: TraceEvent) => void;
}

// trace context for logs, exceptions, measurements
export interface TraceContext {
  trace_id: string;
  span_id: string;
}
