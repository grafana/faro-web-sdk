import type { APIEvent, ExceptionEvent, LogEvent, MeasurementEvent, TraceEvent } from '../api';
import type { MetasValue } from '../metas';

export enum TransportItemType {
  EXCEPTION = 'exception',
  LOG = 'log',
  MEASUREMENT = 'measurement',
  TRACE = 'trace',
}

export type TransportItemPayload<P = APIEvent> = P;

export interface TransportItem<P = APIEvent> {
  type: TransportItemType;
  payload: TransportItemPayload<P>;
  meta: MetasValue;
}

export type Transport = (item: TransportItem) => void | Promise<void>;

export interface TransportBody {
  exceptions?: ExceptionEvent[];
  logs?: LogEvent[];
  measurements?: MeasurementEvent[];
  traces?: TraceEvent[];
  meta: MetasValue;
}

export interface Transports {
  add: (...transports: Transport[]) => void;
  execute: (transportItem: TransportItem) => void;
  value: Transport[];
}
