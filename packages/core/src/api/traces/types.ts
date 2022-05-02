export interface TraceEvent {}

export type GetActiveSpan<S = unknown> = () => S;

export interface TracesAPI<T = unknown, S = unknown> {
  getTracer: () => T;
  isInitialized: () => boolean;
  setTracer: (tracer: T) => void;
  setGetActiveSpanInternal: (getActiveSpanInternal: GetActiveSpan<S>) => void;
  getActiveSpan: GetActiveSpan;
}
