import type { Meta } from '../meta';
import { TransportItemType } from '../transports';
import type { Transports } from '../transports';

export interface TraceEvent {}

export interface LoggerTrace {
  pushTrace: (payload: TraceEvent) => void;
}

export function initializeLoggerTrace(transports: Transports, meta: Meta): LoggerTrace {
  const pushTrace: LoggerTrace['pushTrace'] = (payload) => {
    transports.execute({
      type: TransportItemType.TRACES,
      payload,
      meta: meta.values,
    });
  };

  return {
    pushTrace,
  };
}
