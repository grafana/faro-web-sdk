import { initializeFaro, Observable } from '@grafana/faro-core';
import { mockConfig } from '@grafana/faro-core/src/testUtils';

import {
  MESSAGE_TYPE_DOM_MUTATION,
  MESSAGE_TYPE_HTTP_REQUEST_END,
  MESSAGE_TYPE_HTTP_REQUEST_START,
} from './const';

let http$: Observable<any>;
let dom$: Observable<any>;
let perf$: Observable<any>;

jest.useFakeTimers();

jest.mock('./domMutationMonitor', () => ({
  monitorDomMutations: () => dom$,
}));

jest.mock('./httpRequestMonitor', () => ({
  monitorHttpRequests: () => http$,
}));

jest.mock('./performanceEntriesMonitor', () => ({
  monitorPerformanceEntries: () => perf$,
}));

describe('UserActionInstrumentation output', () => {
  beforeEach(() => {
    http$ = new Observable();
    dom$ = new Observable();
    perf$ = new Observable();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.clearAllTimers();
  });

  it('calls cancel() when no activity is observed', () => {
    const faro = initializeFaro(mockConfig());

    const { UserActionInstrumentation } = require('./instrumentation');
    const inst = new UserActionInstrumentation();
    inst.initialize();

    const ua = faro.api.startUserAction('ua-dom');
    const cancelSpy = jest.spyOn(ua!, 'cancel');

    jest.advanceTimersByTime(200);

    expect(cancelSpy).toHaveBeenCalled();
  });

  it('calls end() when activity is observed via DOM mutations', () => {
    const faro = initializeFaro(mockConfig());

    const { UserActionInstrumentation } = require('./instrumentation');
    const inst = new UserActionInstrumentation();
    inst.initialize();

    const ua = faro.api.startUserAction('ua-dom');
    const endSpy = jest.spyOn(ua!, 'end');

    dom$.notify({ type: MESSAGE_TYPE_DOM_MUTATION });

    jest.advanceTimersByTime(200);

    expect(endSpy).toHaveBeenCalled();
  });

  it('calls end() when activity is observed via performance entries', () => {
    const faro = initializeFaro(mockConfig());

    const { UserActionInstrumentation } = require('./instrumentation');
    const inst = new UserActionInstrumentation();
    inst.initialize();

    const ua = faro.api.startUserAction('ua-perf');
    const endSpy = jest.spyOn(ua!, 'end');

    perf$.notify({ type: 'performance-entry' });

    jest.advanceTimersByTime(200);

    expect(endSpy).toHaveBeenCalled();
  });

  it('calls end() when HTTP request is observed', () => {
    const faro = initializeFaro(mockConfig());

    const { UserActionInstrumentation } = require('./instrumentation');
    const inst = new UserActionInstrumentation();
    inst.initialize();

    const ua = faro.api.startUserAction('ua-http');
    const endSpy = jest.spyOn(ua!, 'end');

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
});
