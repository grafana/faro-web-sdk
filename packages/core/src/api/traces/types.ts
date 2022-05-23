import type { Span, ContextAPI as OTELContextAPI, TraceAPI as OTELTraceAPI } from '@opentelemetry/api';
import type { opentelemetryProto } from '@opentelemetry/exporter-trace-otlp-http/build/src/types';

export type TraceEvent = opentelemetryProto.collector.trace.v1.ExportTraceServiceRequest;

export type GetActiveSpan = () => Span | undefined;

export interface TracesAPI {
  getOTELTraceAPI: () => OTELTraceAPI | undefined;
  getOTELContextAPI: () => OTELContextAPI | undefined;
  setOTELTraceAPI: (traceAPI: OTELTraceAPI) => void;
  setOTELContextAPI: (contextAPI: OTELContextAPI) => void;
  getTraceContext: () => TraceContext | undefined;
  pushTraces: (req: opentelemetryProto.collector.trace.v1.ExportTraceServiceRequest) => void;
}

// trace context for logs, exceptions, measurements
export interface TraceContext {
  trace_id: string;
  span_id: string;
}
