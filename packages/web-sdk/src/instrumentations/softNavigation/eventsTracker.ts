import { Observable } from '@grafana/faro-core';
import { MESSAGE_TYPE_HTTP_REQUEST_END, MESSAGE_TYPE_HTTP_REQUEST_START } from '../userActions/const';
import type { HttpRequestStartMessage, HttpRequestEndMessage, HttpRequestMessagePayload } from '../userActions/types';

export default class EventsTracker extends Observable  {
  initialEventsObservable: Observable;
  relatedEventsObservable: Observable;

  private _tracking: boolean = false;
  private _timeoutId?: number;
  private _currentEvents?: Array<string>;
  private _runningRequests?: Map<string, HttpRequestMessagePayload>;
  private _startTime?: number;
  private _lastEventTime?: number;

  constructor(initialEventsObservable: Observable, relatedEventsObservable: Observable) {
    super();
    this.initialEventsObservable = initialEventsObservable;
    this.relatedEventsObservable = relatedEventsObservable;
    this._initialize();
  }

  _initialize() {
    this.initialEventsObservable
      .filter(() => {
        return !this._tracking;
      })
      .subscribe((event) => {
        this.startTracking(event);
      });

    this.relatedEventsObservable
      .filter(() => {
        return this._tracking;
      })
      .subscribe((event) => {
        this._lastEventTime = Date.now();
        this._currentEvents?.push(event);

        if (isRequestStartMessage(event)) {
          this._runningRequests?.set(event.request.requestId, event.request);
        }

        if (isRequestEndMessage(event)) {
          this._runningRequests?.delete(event.request.requestId);
        }

        if (!this.hasRunningRequests()) {
          this._waitForEvents();
        }
      });
  }

  startTracking(triggerEvent: any) {
    if (this._tracking) {
      return;
    }

    this._tracking = true;
    this._startTime = Date.now();
    this._lastEventTime = Date.now();

    this.notify({
      message: 'tracking-started',
      trigger: triggerEvent
    });

    this._currentEvents = [triggerEvent];
    this._runningRequests = new Map<string, HttpRequestMessagePayload>();
    this._waitForEvents();
  }

  stopTracking() {
    this._tracking = false;

    this.notify({
      message: 'tracking-ended',
      events: this._currentEvents,
      duration: this._lastEventTime ? this._lastEventTime - this._startTime! : 0
    });
  }

  _waitForEvents() {
    this._timeoutId = startTimeout(
      this._timeoutId,
      () => {
        if (!this.hasRunningRequests()) {
          this.stopTracking();
        }
      },
      100
    );
  }

  hasRunningRequests() {
    return this._runningRequests && this._runningRequests?.size > 0;
  }
}

export function isRequestStartMessage(msg: any): msg is HttpRequestStartMessage {
  return msg.type === MESSAGE_TYPE_HTTP_REQUEST_START;
}

export function isRequestEndMessage(msg: any): msg is HttpRequestEndMessage {
  return msg.type === MESSAGE_TYPE_HTTP_REQUEST_END;
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
