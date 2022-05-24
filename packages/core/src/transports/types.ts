import type { APIEvent, ExceptionEvent, LogEvent, MeasurementEvent, TraceEvent } from '../api';
import type { Meta } from '../metas';

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
  meta: Meta;
}

export interface Transport {
  send(item: TransportItem): void | Promise<void>;

  // returns URLs to be ignored by tracing, to not cause a feedback loop
  getIgnoreUrls(): Array<string | RegExp>
}
export interface TransportBody {
  exceptions?: ExceptionEvent[];
  logs?: LogEvent[];
  measurements?: MeasurementEvent[];
  traces?: TraceEvent[];
  meta: Meta;
}

export interface Transports {
  add: (...transports: Transport[]) => void;
  execute: (transportItem: TransportItem) => void;
  value: Transport[];
}
