import type { Span, Tracer } from '@opentelemetry/api';
import type { opentelemetryProto } from '@opentelemetry/exporter-trace-otlp-http/build/src/types';

export type TraceEvent = opentelemetryProto.collector.trace.v1.ExportTraceServiceRequest;

export type GetActiveSpan = () => Span | undefined;

export interface TracesAPI {
  getTracer: () => Tracer | undefined;
  isInitialized: () => boolean;
  setTracer: (tracer: Tracer) => void;
  setGetActiveSpanInternal: (getActiveSpanInternal: GetActiveSpan) => void;
  getActiveSpan: GetActiveSpan;
  pushTraces: (req: opentelemetryProto.collector.trace.v1.ExportTraceServiceRequest) => void;
}
