import { Observable } from '@grafana/faro-core';

import { ActivityWindowTracker, isRequestEndMessage, isRequestStartMessage } from './activityWindowTracker';
import {
  MESSAGE_TYPE_DOM_MUTATION,
  MESSAGE_TYPE_HTTP_REQUEST_END,
  MESSAGE_TYPE_HTTP_REQUEST_START,
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

  it('collects events from a long-running operation', () => {
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

    // Emit the matching end; with new draining semantics it schedules an inactivity window
    events$.notify({ type: MESSAGE_TYPE_HTTP_REQUEST_END, key });
    // Advance inactivity window to allow stop
    jest.advanceTimersByTime(10);
    expect(notifications[1].message).toBe('tracking-ended');
    expect(notifications[1].events.length).toBe(2);
    expect(notifications[1].duration).toBe(10);
  });

  it('stops due to drainTimeoutMs when long-running operation does not end', () => {
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
    expect(end.events.length).toBe(1);
    expect(end.duration).toBe(110);
  });

  it('when last operation ends during drain, schedules inactivity and captures immediate events', () => {
    const events$ = new Observable<any>();
    const tracker = new ActivityWindowTracker(events$, {
      inactivityMs: 10,
      drainTimeoutMs: 1000,
      isOperationStart: (msg) => (msg.type === MESSAGE_TYPE_HTTP_REQUEST_START ? msg.key : undefined),
      isOperationEnd: (msg) => (msg.type === MESSAGE_TYPE_HTTP_REQUEST_END ? msg.key : undefined),
    });

    const notifications: any[] = [];
    tracker.subscribe((n) => notifications.push(n));

    tracker.startTracking();

    const key = 'req-drain-last';
    events$.notify({ type: MESSAGE_TYPE_HTTP_REQUEST_START, key });

    // Trigger inactivity → enter draining
    jest.advanceTimersByTime(10);

    // End the last operation while draining → should cancel drain and schedule inactivity
    events$.notify({ type: MESSAGE_TYPE_HTTP_REQUEST_END, key });

    // Immediate short event triggered by the completion callback should be captured
    const domEvent = { type: MESSAGE_TYPE_DOM_MUTATION, detail: 'after-last-end' };
    events$.notify(domEvent);

    // Let the fresh inactivity window elapse, which should end tracking
    jest.advanceTimersByTime(10);

    const end = notifications.find((n) => n.message === 'tracking-ended');
    expect(end).toBeTruthy();
    expect(end.events).toEqual(expect.arrayContaining([domEvent]));
  });

  it('when any operation ends during drain while others remain, schedules inactivity and captures immediate events', () => {
    const events$ = new Observable<any>();
    const tracker = new ActivityWindowTracker(events$, {
      inactivityMs: 10,
      drainTimeoutMs: 1000,
      isOperationStart: (msg) => (msg.type === MESSAGE_TYPE_HTTP_REQUEST_START ? msg.key : undefined),
      isOperationEnd: (msg) => (msg.type === MESSAGE_TYPE_HTTP_REQUEST_END ? msg.key : undefined),
    });

    const notifications: any[] = [];
    tracker.subscribe((n) => notifications.push(n));

    tracker.startTracking();

    const k1 = 'req-1';
    const k2 = 'req-2';
    events$.notify({ type: MESSAGE_TYPE_HTTP_REQUEST_START, key: k1 });
    events$.notify({ type: MESSAGE_TYPE_HTTP_REQUEST_START, key: k2 });

    // Trigger inactivity → enter draining
    jest.advanceTimersByTime(10);

    // End one operation while another remains → should schedule inactivity window for potential immediate events
    events$.notify({ type: MESSAGE_TYPE_HTTP_REQUEST_END, key: k1 });

    const domEvent = { type: MESSAGE_TYPE_DOM_MUTATION, detail: 'after-one-end' };
    events$.notify(domEvent);

    // Now end the remaining operation to exit draining and start a fresh inactivity window
    events$.notify({ type: MESSAGE_TYPE_HTTP_REQUEST_END, key: k2 });

    // Allow the inactivity window to elapse to finish tracking
    jest.advanceTimersByTime(10);

    const end = notifications.find((n) => n.message === 'tracking-ended');
    expect(end).toBeTruthy();
    expect(end.events).toEqual(expect.arrayContaining([domEvent]));
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
