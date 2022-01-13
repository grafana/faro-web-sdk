import type { CommanderEvent, ExceptionEvent, LogEvent, MeasurementEvent, TraceEvent } from '../commander';
import type { MetaValues } from '../meta';

export enum TransportItemType {
  EXCEPTION = 'exception',
  LOG = 'log',
  MEASUREMENT = 'measurement',
  TRACE = 'trace',
}

export type TransportItemPayload<P = CommanderEvent> = P;

export interface TransportItem<P = CommanderEvent> {
  type: TransportItemType;
  payload: TransportItemPayload<P>;
  meta: MetaValues;
}

export type Transport = (item: TransportItem) => void;

export interface TransportBody {
  exceptions?: ExceptionEvent[];
  logs?: LogEvent[];
  measurements?: MeasurementEvent[];
  traces?: TraceEvent[];
  meta: MetaValues;
}

export interface Transports {
  add: (...transports: Transport[]) => void;
  execute: (transportItem: TransportItem) => void;
  value: Transport[];
}
