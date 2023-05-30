import type { APIEvent, EventEvent, ExceptionEvent, LogEvent, MeasurementEvent, TraceEvent } from '../api';
import type { Patterns } from '../config';
import type { Extension } from '../extensions';
import type { Meta } from '../metas';

import type { TransportItemType } from './const';

export type TransportItemPayload<P = APIEvent> = P;

export type SendFn<P = APIEvent> = (items: Array<TransportItem<P>>) => void;
export type BeforeSendHook<P = APIEvent> = (item: TransportItem<P>) => TransportItem<P> | null;

export interface TransportItem<P = APIEvent> {
  type: TransportItemType;
  payload: TransportItemPayload<P>;
  meta: Meta;
}

export interface Transport extends Extension {
  send(items: TransportItem[]): void | Promise<void>;

  // returns URLs to be ignored by tracing, to not cause a feedback loop
  getIgnoreUrls(): Patterns;
}

export type BodyKey = 'exceptions' | 'logs' | 'measurements' | 'traces' | 'events';

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

export interface BatchExecutorOptions {
  readonly enabled?: boolean;
  // If no new signal arrives after "batchSendTimeout" ms, send the payload. If set to 0, timeout is disabled
  readonly sendTimeout?: number;
  // Buffer "sendLimit" is the number of signals before sending the payload
  readonly itemLimit?: number;
  readonly paused?: boolean;
}
