export interface TraceEvent {}

export interface TracesAPI {
  pushSpan: (payload: TraceEvent) => void;
}
