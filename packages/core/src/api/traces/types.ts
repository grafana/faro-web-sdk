import type { Span, ContextAPI as OTELContextAPI, TraceAPI as OTELTraceAPI } from '@opentelemetry/api';
import type { opentelemetryProto } from '@opentelemetry/exporter-trace-otlp-http/build/src/types';

export type TraceEvent = opentelemetryProto.collector.trace.v1.ExportTraceServiceRequest;

export type GetActiveSpan = () => Span | undefined;

export type OTELApi = {
  trace: OTELTraceAPI;
  context: OTELContextAPI;
};

export interface TracesAPI {
  initOTEL: (trace: OTELTraceAPI, context: OTELContextAPI) => void;
  getOTEL: () => OTELApi | undefined;
  getTraceContext: () => TraceContext | undefined;
  pushTraces: (req: opentelemetryProto.collector.trace.v1.ExportTraceServiceRequest) => void;
}

// trace context for logs, exceptions, measurements
export interface TraceContext {
  trace_id: string;
  span_id: string;
}
