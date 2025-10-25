import { Observable } from '@grafana/faro-core';
import {
  ActivityWindowTracker,
  isRequestStartMessage,
  isRequestEndMessage,
} from './activityWindowTracker';
import {
  MESSAGE_TYPE_HTTP_REQUEST_START,
  MESSAGE_TYPE_HTTP_REQUEST_END,
} from './monitors/const';

describe('ActivityWindowTracker', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(0);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('starts and auto-stops with no events', () => {
    const events$ = new Observable<any>();
    const tracker = new ActivityWindowTracker(events$, { inactivityMs: 10, drainTimeoutMs: 100 });
    const notifications: any[] = [];
    tracker.subscribe((n) => notifications.push(n));

    tracker.startTracking();
    expect(notifications[0]).toEqual({ message: 'tracking-started' });

    jest.advanceTimersByTime(10);

    expect(notifications[1].message).toBe('tracking-ended');
    expect(notifications[1].events).toEqual([]);
    expect(notifications[1].duration).toBe(0);
  });

  it('collects events and computes duration based on last event time', () => {
    const events$ = new Observable<any>();
    const tracker = new ActivityWindowTracker(events$, { inactivityMs: 10, drainTimeoutMs: 100 });
    const notifications: any[] = [];
    tracker.subscribe((n) => notifications.push(n));

    tracker.startTracking();
    expect(notifications[0]).toEqual({ message: 'tracking-started' });

    // Emit an event at t=0
    const e1 = { id: 1 };
    events$.notify(e1);

    // Advance time, emit another event, ensure follow-up reschedules
    jest.advanceTimersByTime(5);
    jest.setSystemTime(5);
    const e2 = { id: 2 };
    events$.notify(e2);

    // After another inactivity window with no more events, it should end
    jest.advanceTimersByTime(10);
    expect(notifications[1].message).toBe('tracking-ended');
    expect(notifications[1].events).toEqual([e1, e2]);
    expect(notifications[1].duration).toBe(5);
  });

  it('defers stop while operation start is active and stops on end', () => {
    const events$ = new Observable<any>();
    const tracker = new ActivityWindowTracker(events$, {
      inactivityMs: 10,
      drainTimeoutMs: 100,
      isOperationStart: (msg) => (msg.type === MESSAGE_TYPE_HTTP_REQUEST_START ? msg.key : undefined),
      isOperationEnd: (msg) => (msg.type === MESSAGE_TYPE_HTTP_REQUEST_END ? msg.key : undefined),
    });
    const notifications: any[] = [];
    tracker.subscribe((n) => notifications.push(n));

    tracker.startTracking();

    // Start a long-running operation (HTTP request)
    const key = 'req-1';
    events$.notify({ type: MESSAGE_TYPE_HTTP_REQUEST_START, key });

    // Inactivity check fires but should not stop due to active operation; drain timeout starts
    jest.advanceTimersByTime(10);

    // Emit the matching end; should stop immediately (since no more active operations)
    events$.notify({ type: MESSAGE_TYPE_HTTP_REQUEST_END, key });

    expect(notifications.find((n) => n.message === 'tracking-ended')).toBeTruthy();
  });

  it('stops due to drainTimeoutMs when operation persists', () => {
    const events$ = new Observable<any>();
    const tracker = new ActivityWindowTracker(events$, {
      inactivityMs: 10,
      drainTimeoutMs: 100,
      isOperationStart: (msg) => (msg.type === MESSAGE_TYPE_HTTP_REQUEST_START ? msg.key : undefined),
      isOperationEnd: (msg) => (msg.type === MESSAGE_TYPE_HTTP_REQUEST_END ? msg.key : undefined),
    });
    const notifications: any[] = [];
    tracker.subscribe((n) => notifications.push(n));

    tracker.startTracking();
    events$.notify({ type: MESSAGE_TYPE_HTTP_REQUEST_START, key: 'req-1' });

    // Inactivity after 10ms detects active operation and starts drain timer
    jest.advanceTimersByTime(10);
    // Advance until drainTimeoutMs elapses and stop is triggered
    jest.advanceTimersByTime(100);

    const end = notifications.find((n) => n.message === 'tracking-ended');
    expect(end).toBeTruthy();
  });

  it('type guards return correct booleans', () => {
    const startMsg = { type: MESSAGE_TYPE_HTTP_REQUEST_START } as any;
    const endMsg = { type: MESSAGE_TYPE_HTTP_REQUEST_END } as any;
    const other = { type: 'other' } as any;

    expect(isRequestStartMessage(startMsg)).toBe(true);
    expect(isRequestStartMessage(endMsg)).toBe(false);
    expect(isRequestStartMessage(other)).toBe(false);

    expect(isRequestEndMessage(endMsg)).toBe(true);
    expect(isRequestEndMessage(startMsg)).toBe(false);
    expect(isRequestEndMessage(other)).toBe(false);
  });
});


