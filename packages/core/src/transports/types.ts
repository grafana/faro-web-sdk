import type { APIEvent, EventEvent, ExceptionEvent, LogEvent, MeasurementEvent, TraceEvent } from '../api';
import type { Patterns } from '../config';
import type { Extension } from '../extensions';
import type { Meta } from '../metas';

import type { TransportItemType } from './const';

export type TransportItemPayload<P = APIEvent> = P;

export type BeforeSendHook<P = APIEvent> = (item: TransportItem<P>) => TransportItem<P> | null;

export interface TransportItem<P = APIEvent> {
  type: TransportItemType;
  payload: TransportItemPayload<P>;
  meta: Meta;
}

export interface Transport extends Extension {
  send(items: TransportItem | TransportItem[]): void | Promise<void>;

  // returns URLs to be ignored by tracing, to not cause a feedback loop
  getIgnoreUrls(): Patterns;
}

export interface TransportBody {
  meta: Meta;

  exceptions?: ExceptionEvent[];
  logs?: LogEvent[];
  measurements?: MeasurementEvent[];
  traces?: TraceEvent;
  events?: EventEvent[];
}

export interface Transports {
  add: (...transports: Transport[]) => void;
  addBeforeSendHooks: (...hooks: Array<BeforeSendHook | undefined>) => void;
  addIgnoreErrorsPatterns: (...ignoreErrorsPatterns: Array<Patterns | undefined>) => void;
  execute: (transportItem: TransportItem) => void;
  getBeforeSendHooks: () => BeforeSendHook[];
  isPaused: () => boolean;
  remove: (...transports: Transport[]) => void;
  removeBeforeSendHooks: (...hooks: Array<BeforeSendHook | undefined>) => void;
  transports: Transport[];
  pause: () => void;
  unpause: () => void;
}
