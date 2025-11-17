import { Observable } from '@grafana/faro-core';

import { MESSAGE_TYPE_HTTP_REQUEST_END, MESSAGE_TYPE_HTTP_REQUEST_START } from './monitors/const';
import type { HttpRequestEndMessage, HttpRequestStartMessage } from './monitors/types';

type OperationKey = string;

export function isRequestStartMessage(msg: any): msg is HttpRequestStartMessage {
  return msg.type === MESSAGE_TYPE_HTTP_REQUEST_START;
}

export function isRequestEndMessage(msg: any): msg is HttpRequestEndMessage {
  return msg.type === MESSAGE_TYPE_HTTP_REQUEST_END;
}

export interface ActivityWindowTrackerOptions<TMsg = any> {
  inactivityMs?: number;
  drainTimeoutMs?: number;
  isOperationStart?: (msg: TMsg) => OperationKey | undefined;
  isOperationEnd?: (msg: TMsg) => OperationKey | undefined;
}

/**
 * Tracks events in a time‑boxed activity window. When the window goes quiet for `inactivityMs`,
 * it enters a draining phase: new short events are ignored; only active operations are awaited
 * until they end or `drainTimeoutMs` elapses.
 */
export class ActivityWindowTracker extends Observable {
  eventsObservable: Observable;

  private _tracking = false;
  private _inactivityTid?: number;
  private _drainTid?: number;
  private _currentEvents?: any[];
  private _activeOperations?: Map<OperationKey, true>;
  private _startTime?: number;
  private _lastEventTime?: number;
  private _options: Required<ActivityWindowTrackerOptions>;

  constructor(eventsObservable: Observable, options?: ActivityWindowTrackerOptions) {
    super();
    this.eventsObservable = eventsObservable;
    this._options = {
      inactivityMs: options?.inactivityMs ?? 100,
      drainTimeoutMs: options?.drainTimeoutMs ?? 10 * 1000,
      isOperationStart: options?.isOperationStart ?? (() => undefined),
      isOperationEnd: options?.isOperationEnd ?? (() => undefined),
    } as Required<ActivityWindowTrackerOptions>;
    this._initialize();
  }

  private _initialize() {
    this.eventsObservable
      .filter(() => {
        return this._tracking;
      })
      .subscribe((event) => {
        this._lastEventTime = Date.now();
        this._currentEvents?.push(event);

        const startKey = this._options.isOperationStart(event as any);
        if (startKey) {
          this._activeOperations?.set(startKey, true);
        }

        const endKey = this._options.isOperationEnd(event as any);
        if (endKey) {
          this._activeOperations?.delete(endKey);
        }

        this._scheduleInactivityCheck();
      });
  }

  startTracking() {
    if (this._tracking) {
      return;
    }

    this._tracking = true;
    this._startTime = Date.now();
    this._lastEventTime = Date.now();

    this.notify({
      message: 'tracking-started',
    });

    this._currentEvents = [];
    this._activeOperations = new Map<OperationKey, true>();
    this._scheduleInactivityCheck();
  }

  stopTracking() {
    this._tracking = false;
    this._clearTimer(this._inactivityTid);
    this._clearTimer(this._drainTid);

    let duration = 0;
    if (this.hasActiveOperations()) {
      duration = Date.now() - this._startTime!;
    } else {
      duration = this._lastEventTime ? this._lastEventTime - this._startTime! : 0;
    }

    this.notify({
      message: 'tracking-ended',
      events: this._currentEvents,
      duration: duration,
    });
  }

  private _scheduleInactivityCheck() {
    this._inactivityTid = startTimeout(
      this._inactivityTid,
      () => {
        if (this.hasActiveOperations()) {
          this._startDrainTimeout();
        } else {
          this.stopTracking();
        }
      },
      this._options.inactivityMs
    );
  }

  private _startDrainTimeout() {
    this._drainTid = startTimeout(
      this._drainTid,
      () => {
        this.stopTracking();
      },
      this._options.drainTimeoutMs
    );
  }

  private hasActiveOperations(): boolean {
    return !!this._activeOperations && this._activeOperations.size > 0;
  }

  private _clearTimer(id?: number) {
    if (id) {
      clearTimeout(id);
    }
  }
}

function startTimeout(timeoutId: number | undefined, cb: () => void, delay: number) {
  if (timeoutId) {
    clearTimeout(timeoutId);
  }

  //@ts-expect-error for some reason vscode is using the node types
  timeoutId = setTimeout(() => {
    cb();
  }, delay);

  return timeoutId;
}
