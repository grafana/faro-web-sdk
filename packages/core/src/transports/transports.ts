import type { ExceptionsEvent, LoggingEvent, MeasurementsEvent, TracingEvent } from '../commander';
import type { Config } from '../config';
import type { MetaValues } from '../meta';

export enum TransportItemType {
  EXCEPTIONS = 'exceptions',
  LOGS = 'logs',
  MEASUREMENTS = 'measurements',
  TRACES = 'traces',
}

export type AllPayloadTypes = LoggingEvent | ExceptionsEvent | MeasurementsEvent | TracingEvent;

export type TransportPayload<P = AllPayloadTypes> = P;

export interface TransportItem<P = AllPayloadTypes> {
  type: TransportItemType;
  payload: TransportPayload<P>;
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
