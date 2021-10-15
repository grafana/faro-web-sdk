import { LoggerBufferItemType, pushEvent } from './buffer';

export interface TraceEvent {}

export function pushTrace(payload: TraceEvent | null): void {
  if (payload) {
    pushEvent(LoggerBufferItemType.TRACES, payload);
  }
}
