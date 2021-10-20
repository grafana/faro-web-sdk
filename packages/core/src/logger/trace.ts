import type { Meta } from '../meta';
import { TransportItemType } from '../transports';
import type { Transports } from '../transports';

export interface TraceEvent {}

export interface Traces {
  pushTraces: (payload: TraceEvent | null) => void;
}

export function initializeTraces(transports: Transports, meta: Meta): Traces {
  const pushTraces: Traces['pushTraces'] = (payload) => {
    if (payload) {
      transports.execute({
        type: TransportItemType.TRACES,
        payload,
        meta: meta.values,
      });
    }
  };

  return {
    pushTraces,
  };
}
