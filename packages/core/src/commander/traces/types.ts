export interface TraceEvent {}

export interface TracesCommands {
  pushSpan: (payload: TraceEvent) => void;
}
