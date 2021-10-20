import type { Config } from '../config';
import type { ExceptionEvent, LogEvent, TraceEvent } from '../logger';
import type { MetaValues } from '../meta';

export enum TransportItemType {
  LOGS = 'logs',
  EXCEPTIONS = 'exceptions',
  TRACES = 'traces',
}

export type TransportPayload = LogEvent | ExceptionEvent | TraceEvent;

export interface TransportItem {
  type: TransportItemType;
  payload: TransportPayload;
  meta: MetaValues;
}

export type Transport = (item: TransportItem) => void;

export interface Transports {
  add: (...transports: Transport[]) => void;
  execute: (item: TransportItem) => void;
  value: Transport[];
}

export function initializeTransports(config: Config): Transports {
  const value: Transport[] = [...config.transports];

  const add: Transports['add'] = (...transports) => {
    value.push(...transports);
  };

  const execute: Transports['execute'] = (payload) => {
    value.forEach((transport) => transport(payload));
  };

  return {
    add,
    execute,
    value,
  };
}
