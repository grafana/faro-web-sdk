import { Observable } from '@grafana/faro-core';
import { MESSAGE_TYPE_HTTP_REQUEST_END, MESSAGE_TYPE_HTTP_REQUEST_START } from './monitors/const';
import type { HttpRequestStartMessage, HttpRequestEndMessage } from './monitors/types';

type BlockingKey = string;

export function isRequestStartMessage(msg: any): msg is HttpRequestStartMessage {
  return msg.type === MESSAGE_TYPE_HTTP_REQUEST_START;
}

export function isRequestEndMessage(msg: any): msg is HttpRequestEndMessage {
  return msg.type === MESSAGE_TYPE_HTTP_REQUEST_END;
}

export interface ActivityWindowTrackerOptions<TMsg = any> {
  followUpMs?: number;
  haltMs?: number;
  isBlockingStart?: (msg: TMsg) => BlockingKey | undefined;
  isBlockingEnd?: (msg: TMsg) => BlockingKey | undefined;
}

export class ActivityWindowTracker extends Observable {
  eventsObservable: Observable;

  private _tracking: boolean = false;
  private _followUpTid?: number;
  private _haltTid?: number;
  private _currentEvents?: Array<any>;
  private _runningBlocking?: Map<BlockingKey, true>;
  private _startTime?: number;
  private _lastEventTime?: number;
  private _options: Required<ActivityWindowTrackerOptions>;

  constructor(eventsObservable: Observable, options?: ActivityWindowTrackerOptions) {
    super();
    this.eventsObservable = eventsObservable;
    this._options = {
      followUpMs: options?.followUpMs ?? 100,
      haltMs: options?.haltMs ?? 10 * 1000,
      isBlockingStart: options?.isBlockingStart ?? (() => undefined),
      isBlockingEnd: options?.isBlockingEnd ?? (() => undefined),
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

        const startKey = this._options.isBlockingStart(event as any);
        if (startKey) {
          this._runningBlocking?.set(startKey, true);
        }

        const endKey = this._options.isBlockingEnd(event as any);
        if (endKey) {
          this._runningBlocking?.delete(endKey);
        }

        if (!endKey) {
          this._scheduleFollowUp();
        } else if (!this.hasBlockingWork()) {
          this.stopTracking();
        }
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
    this._runningBlocking = new Map<BlockingKey, true>();
    this._scheduleFollowUp();
  }

  stopTracking() {
    this._tracking = false;
    this._clearTimer(this._followUpTid);
    this._clearTimer(this._haltTid);

    this.notify({
      message: 'tracking-ended',
      events: this._currentEvents,
      duration: this._lastEventTime ? this._lastEventTime - this._startTime! : 0,
    });
  }

  private _scheduleFollowUp() {
    this._followUpTid = startTimeout(
      this._followUpTid,
      () => {
        if (this.hasBlockingWork()) {
          this._startHaltTimeout();
        } else {
          this.stopTracking();
        }
      },
      this._options.followUpMs
    );
  }

  private _startHaltTimeout() {
    this._haltTid = startTimeout(
      this._haltTid,
      () => {
        this.stopTracking();
      },
      this._options.haltMs
    );
  }

  private hasBlockingWork(): boolean {
    return !!this._runningBlocking && this._runningBlocking.size > 0;
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
