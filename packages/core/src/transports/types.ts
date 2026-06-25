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
  send(items: TransportItem | TransportItem[]): void | Promise<void>;

  // returns URLs to be ignored by tracing, to not cause a feedback loop
  getIgnoreUrls(): Patterns;
  // returns wether the transport supports processing of a batches of items
  isBatched(): boolean;
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
  execute: (transportItem: TransportItem) => void;
  getBeforeSendHooks: () => BeforeSendHook[];
  isPaused: () => boolean;
  remove: (...transports: Transport[]) => void;
  removeBeforeSendHooks: (...hooks: Array<BeforeSendHook | undefined>) => void;
  transports: Transport[];
  pause: () => void;
  unpause: () => void;
  /**
   * Start holding (buffering) outgoing signals in a bounded in-memory queue instead of sending them.
   * Used by opt-in features (e.g. remote config) that need to defer a send/drop decision without
   * losing early telemetry. While holding, `execute` enqueues items rather than transporting them.
   *
   * `onBufferFull` is invoked once if the buffered byte size exceeds `maxBufferBytes` before the
   * hold is released, allowing the caller to finalize early.
   */
  hold: (options?: HoldOptions) => void;
  /**
   * Release the hold and send all buffered items through the normal `execute` path, then resume
   * streaming. No-op if not currently holding.
   */
  flushHeld: () => void;
  /**
   * Release the hold and discard all buffered items, then resume streaming. No-op if not currently
   * holding.
   */
  dropHeld: () => void;
  /**
   * Whether the transports are currently holding (buffering) outgoing signals.
   */
  isHolding: () => boolean;
}

export interface HoldOptions {
  // Maximum total byte size of buffered items before `onBufferFull` fires (default: 65536 / 64KB).
  maxBufferBytes?: number;
  // Invoked once when the buffered byte size first exceeds `maxBufferBytes`.
  onBufferFull?: () => void;
}

export interface BatchExecutorOptions {
  readonly enabled?: boolean;
  // If no new signal arrives after "batchSendTimeout" ms, send the payload. If set to 0, timeout is disabled
  readonly sendTimeout?: number;
  // Buffer "sendLimit" is the number of signals before sending the payload
  readonly itemLimit?: number;
  readonly paused?: boolean;
}
