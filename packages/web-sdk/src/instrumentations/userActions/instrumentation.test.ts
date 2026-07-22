import { initializeFaro, Observable, UserActionInternalInterface } from '@grafana/faro-core';
import { mockConfig } from '@grafana/faro-core/src/testUtils';

import { MESSAGE_TYPE_DOM_MUTATION, MESSAGE_TYPE_HTTP_REQUEST_END, MESSAGE_TYPE_HTTP_REQUEST_START } from './const';
import { UserActionInstrumentation } from './instrumentation';
import { getUserEventHandler } from './processUserActionEventHandler';
import { UserActionController } from './userActionController';

let http$: Observable<any>;
let dom$: Observable<any>;
let perf$: Observable<any>;

jest.useFakeTimers();

jest.mock('../_internal/monitors/domMutationMonitor', () => ({
  monitorDomMutations: () => dom$,
}));

jest.mock('../_internal/monitors/httpRequestMonitor', () => ({
  monitorHttpRequests: () => http$,
}));

jest.mock('../_internal/monitors/performanceEntriesMonitor', () => ({
  monitorPerformanceEntries: () => perf$,
}));

describe('UserActionInstrumentation output', () => {
  let inst: UserActionInstrumentation;

  beforeEach(() => {
    http$ = new Observable();
    dom$ = new Observable();
    perf$ = new Observable();
    jest.clearAllMocks();
  });

  afterEach(() => {
    inst?.destroy();
    jest.runOnlyPendingTimers();
    jest.clearAllTimers();
  });

  it('calls cancel() when no activity is observed', () => {
    const faro = initializeFaro(mockConfig());

    inst = new UserActionInstrumentation();
    inst.initialize();

    const ua = faro.api.startUserAction('ua-dom');
    const cancelSpy = jest.spyOn(ua as unknown as UserActionInternalInterface, 'cancel');

    jest.advanceTimersByTime(200);

    expect(cancelSpy).toHaveBeenCalled();
  });

  it('registers only the pointerdown and keydown browser triggers', () => {
    initializeFaro(mockConfig());
    const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
    inst = new UserActionInstrumentation();
    inst.initialize();

    const registeredEvents = addEventListenerSpy.mock.calls.map(([eventName]) => eventName);
    expect(registeredEvents).toEqual(['pointerdown', 'keydown']);
    expect(registeredEvents).not.toContain('click');
    expect(registeredEvents).not.toContain('change');

    addEventListenerSpy.mockRestore();
  });

  it('calls end() when activity is observed via DOM mutations', () => {
    const faro = initializeFaro(mockConfig());

    inst = new UserActionInstrumentation();
    inst.initialize();

    const ua = faro.api.startUserAction('ua-dom');
    const endSpy = jest.spyOn(ua as unknown as UserActionInternalInterface, 'end');

    dom$.notify({ type: MESSAGE_TYPE_DOM_MUTATION });

    jest.advanceTimersByTime(200);

    expect(endSpy).toHaveBeenCalled();
  });

  it('calls end() when activity is observed via performance entries', () => {
    const faro = initializeFaro(mockConfig());

    inst = new UserActionInstrumentation();
    inst.initialize();

    const ua = faro.api.startUserAction('ua-perf');
    const endSpy = jest.spyOn(ua as unknown as UserActionInternalInterface, 'end');

    perf$.notify({ type: 'performance-entry' });

    jest.advanceTimersByTime(200);

    expect(endSpy).toHaveBeenCalled();
  });

  it('calls end() when HTTP request is observed', () => {
    const faro = initializeFaro(mockConfig());

    inst = new UserActionInstrumentation();
    inst.initialize();

    const ua = faro.api.startUserAction('ua-http');
    const endSpy = jest.spyOn(ua as unknown as UserActionInternalInterface, 'end');

    const requestId = 'req-1';
    http$.notify({
      type: MESSAGE_TYPE_HTTP_REQUEST_START,
      request: { requestId, url: '/x', method: 'GET', apiType: 'fetch' },
    });

    // Allow follow-up window to elapse and transition into waiting-for-HTTP-completion
    jest.advanceTimersByTime(150);

    http$.notify({
      type: MESSAGE_TYPE_HTTP_REQUEST_END,
      request: { requestId, url: '/x', method: 'GET', apiType: 'fetch' },
    });

    expect(endSpy).toHaveBeenCalled();
  });

  it('uses an API timeout override in preference to the global timeout', () => {
    const faro = initializeFaro(mockConfig({ userActionsInstrumentation: { initialActivityTimeout: 300 } }));
    inst = new UserActionInstrumentation();
    inst.initialize();

    const ua = faro.api.startUserAction('ua-api', undefined, { initialActivityTimeout: 500 });
    const cancelSpy = jest.spyOn(ua as unknown as UserActionInternalInterface, 'cancel');

    jest.advanceTimersByTime(300);
    expect(cancelSpy).not.toHaveBeenCalled();

    jest.advanceTimersByTime(200);
    expect(cancelSpy).toHaveBeenCalledTimes(1);
  });

  it('uses an element timeout override in preference to the global timeout', () => {
    const faro = initializeFaro(
      mockConfig({
        userActionsInstrumentation: {
          dataAttributeName: 'data-faro-user-action-name',
          initialActivityTimeout: 300,
        },
      })
    );
    inst = new UserActionInstrumentation();
    inst.initialize();
    const element = document.createElement('button');
    element.setAttribute('data-faro-user-action-name', 'ua-element');
    element.setAttribute('data-faro-user-action-timeout', '500');

    getUserEventHandler(faro).processUserEvent({ type: 'pointerdown', target: element } as unknown as PointerEvent);
    const ua = faro.api.getActiveUserAction();
    const cancelSpy = jest.spyOn(ua as unknown as UserActionInternalInterface, 'cancel');

    jest.advanceTimersByTime(300);
    expect(cancelSpy).not.toHaveBeenCalled();

    jest.advanceTimersByTime(200);
    expect(cancelSpy).toHaveBeenCalledTimes(1);
  });

  it('falls back to the global timeout for a malformed element override', () => {
    const faro = initializeFaro(
      mockConfig({
        userActionsInstrumentation: {
          dataAttributeName: 'data-faro-user-action-name',
          initialActivityTimeout: 300,
        },
      })
    );
    inst = new UserActionInstrumentation();
    inst.initialize();
    const element = document.createElement('button');
    element.setAttribute('data-faro-user-action-name', 'ua-element');
    element.setAttribute('data-faro-user-action-timeout', 'invalid');

    getUserEventHandler(faro).processUserEvent({ type: 'pointerdown', target: element } as unknown as PointerEvent);
    const ua = faro.api.getActiveUserAction();
    const cancelSpy = jest.spyOn(ua as unknown as UserActionInternalInterface, 'cancel');

    jest.advanceTimersByTime(299);
    expect(cancelSpy).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(cancelSpy).toHaveBeenCalledTimes(1);
  });

  it('falls back to the global timeout for an invalid API override', () => {
    const faro = initializeFaro(mockConfig({ userActionsInstrumentation: { initialActivityTimeout: 300 } }));
    inst = new UserActionInstrumentation();
    inst.initialize();

    const ua = faro.api.startUserAction('ua-api', undefined, { initialActivityTimeout: Number.POSITIVE_INFINITY });
    const cancelSpy = jest.spyOn(ua as unknown as UserActionInternalInterface, 'cancel');

    jest.advanceTimersByTime(299);
    expect(cancelSpy).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(cancelSpy).toHaveBeenCalledTimes(1);
  });

  it('clamps an API timeout override to 1000 ms', () => {
    const faro = initializeFaro(mockConfig());
    inst = new UserActionInstrumentation();
    inst.initialize();

    const ua = faro.api.startUserAction('ua-api', undefined, { initialActivityTimeout: 1500 });
    const cancelSpy = jest.spyOn(ua as unknown as UserActionInternalInterface, 'cancel');

    jest.advanceTimersByTime(999);
    expect(cancelSpy).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(cancelSpy).toHaveBeenCalledTimes(1);
  });

  it.each(['manual', 'declarative'])('attaches exactly one controller for a %s start', (startType) => {
    const faro = initializeFaro(
      mockConfig({ userActionsInstrumentation: { dataAttributeName: 'data-faro-user-action-name' } })
    );
    const attachSpy = jest.spyOn(UserActionController.prototype, 'attach').mockImplementation(() => undefined);
    inst = new UserActionInstrumentation();
    inst.initialize();

    if (startType === 'manual') {
      faro.api.startUserAction('ua-manual');
    } else {
      const element = document.createElement('button');
      element.setAttribute('data-faro-user-action-name', 'ua-declarative');
      getUserEventHandler(faro).processUserEvent({ type: 'pointerdown', target: element } as unknown as PointerEvent);
    }

    expect(attachSpy).toHaveBeenCalledTimes(1);
    attachSpy.mockRestore();
  });
});
