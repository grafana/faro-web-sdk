import { pushEvent, QueueItemType } from '../queue';

export interface TraceEvent {}

export function pushTrace(payload: TraceEvent | null): void {
  if (payload) {
    pushEvent(QueueItemType.TRACES, payload);
  }
}
