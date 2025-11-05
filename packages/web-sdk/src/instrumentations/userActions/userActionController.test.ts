import { jest } from '@jest/globals';

import { Observable, UserActionState } from '@grafana/faro-core';

import { MESSAGE_TYPE_HTTP_REQUEST_END, MESSAGE_TYPE_HTTP_REQUEST_START } from './const';
import { UserActionController } from './userActionController';

let httpObservable = new Observable();
jest.mock('../_internal/monitors/httpRequestMonitor', () => ({ monitorHttpRequests: () => httpObservable }));
jest.mock('../_internal/monitors/domMutationMonitor', () => ({ monitorDomMutations: () => new Observable() }));
jest.mock('../_internal/monitors/performanceEntriesMonitor', () => ({
  monitorPerformanceEntries: () => new Observable(),
}));

describe('UserActionController', () => {
  let fakeAction: any;

  beforeEach(() => {
    let state = UserActionState.Started;
    fakeAction = {
      end: jest.fn(),
      cancel: jest.fn(),
      getState: jest.fn().mockImplementation(() => state),
      // Provide Observable-like API used by controller for state cleanup
      filter: jest.fn().mockReturnValue({ first: jest.fn().mockReturnValue({ subscribe: jest.fn() }) }),
      halt: jest.fn().mockImplementation(() => {
        state = UserActionState.Halted;
      }),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    httpObservable = new Observable();
  });

  it('allows processing if there are running requests', () => {
    jest.useFakeTimers();

    const controller = new UserActionController(fakeAction);
    controller.attach();

    httpObservable.notify({
      type: MESSAGE_TYPE_HTTP_REQUEST_START,
      request: {
        requestId: 'foo',
        url: '/bar',
        method: 'POST',
        apiType: 'xhr',
      },
    });

    // Advance the follow-up timer so the controller transitions to halted state internally
    jest.advanceTimersByTime(101);

    // While request is running, action should not be ended or cancelled
    expect(fakeAction.end).not.toHaveBeenCalled();
    expect(fakeAction.cancel).not.toHaveBeenCalled();

    // Finishing the pending request should end the action
    httpObservable.notify({
      type: MESSAGE_TYPE_HTTP_REQUEST_END,
      request: {
        requestId: 'foo',
        url: '/bar',
        method: 'POST',
        apiType: 'xhr',
      },
    });

    expect(fakeAction.end).toHaveBeenCalled();
    expect(fakeAction.cancel).not.toHaveBeenCalled();
  });

  it('does not allow processing if there are running requests but the request id is not pending', () => {
    jest.useFakeTimers();

    const controller = new UserActionController(fakeAction);
    controller.attach();

    // Start a request with id 'foo'
    httpObservable.notify({
      type: MESSAGE_TYPE_HTTP_REQUEST_START,
      request: {
        requestId: 'foo',
        url: '/bar',
        method: 'POST',
        apiType: 'xhr',
      },
    });

    // Move past the follow-up window so the controller halts due to pending requests
    jest.advanceTimersByTime(101);

    // End a different request id; original 'foo' is still pending
    httpObservable.notify({
      type: MESSAGE_TYPE_HTTP_REQUEST_END,
      request: {
        requestId: 'bar',
        url: '/bar',
        method: 'POST',
        apiType: 'xhr',
      },
    });

    // Action should not end or cancel because the pending request hasn't finished
    expect(fakeAction.end).not.toHaveBeenCalled();
    expect(fakeAction.cancel).not.toHaveBeenCalled();
  });
});
