import { jest } from '@jest/globals';

import { Observable, UserActionState } from '@grafana/faro-core';
import type { Faro, Subscription } from '@grafana/faro-core';

import { userActionDataAttributeParsed as defaultDataAttribute, MESSAGE_TYPE_HTTP_REQUEST_START } from './const';
import {
  getUserActionNameFromElement,
  getUserEventHandler,
  unsubscribeAllMonitors,
} from './processUserActionEventHandler';
// Test for UserActionController moved to userActionController.test.ts

// Stub dummy Observable for monitors
class DummyObservable {
  merge(..._sources: any[]): this {
    return this;
  }
  takeWhile(_pred: any): this {
    return this;
  }
  filter(_fn: any): this {
    return this;
  }
  notify(_: any): this {
    return this;
  }
  subscribe(_handler: any): Subscription {
    return { unsubscribe: jest.fn() };
  }
}

let httpObservable = new Observable();
jest.mock('../_internal/monitors/httpRequestMonitor', () => ({ monitorHttpRequests: () => httpObservable }));
jest.mock('../_internal/monitors/domMutationMonitor', () => ({ monitorDomMutations: () => new Observable() }));
jest.mock('../_internal/monitors/performanceEntriesMonitor', () => ({
  monitorPerformanceEntries: () => new Observable(),
}));

describe('Utility functions', () => {
  it('getUserActionNameFromElement returns matching dataset value', () => {
    const element = document.createElement('div');
    const customAttr = 'data-foo-bar';
    element.dataset['fooBar'] = 'baz';

    const result = getUserActionNameFromElement(element, customAttr);
    expect(result).toBe('baz');
  });

  it('getUserActionNameFromElement returns undefined if no match', () => {
    const element = document.createElement('div');
    element.dataset['other'] = 'value';

    const result = getUserActionNameFromElement(element, defaultDataAttribute);
    expect(result).toBeUndefined();
  });

  it('unsubscribeAllMonitors calls unsubscribe on subscription', () => {
    const sub: Subscription = { unsubscribe: jest.fn() };
    unsubscribeAllMonitors(sub);
    expect(sub.unsubscribe).toHaveBeenCalled();
  });
});

describe('getUserEventHandler', () => {
  let faro: Partial<Faro>;
  let startSpy: jest.Mock;
  let getCurrentSpy: jest.Mock;
  let fakeAction: any;

  beforeEach(() => {
    // Mock monitors to use DummyObservable
    jest.mock('../_internal/monitors/domMutationMonitor', () => ({ monitorDomMutations: () => new DummyObservable() }));
    jest.mock('../_internal/monitors/performanceEntriesMonitor', () => ({
      monitorPerformanceEntries: () => new DummyObservable(),
    }));

    startSpy = jest.fn();
    getCurrentSpy = jest.fn();

    fakeAction = {
      extend: jest.fn(),
      end: jest.fn(),
      getState: jest.fn().mockReturnValue(UserActionState.Started),
      filter: jest.fn().mockReturnValue({ first: jest.fn().mockReturnValue({ subscribe: jest.fn() }) }),
    };

    faro = {
      api: {
        startUserAction: startSpy.mockReturnValue(fakeAction),
        getActiveUserAction: getCurrentSpy,
      } as any,
      config: {
        userActionsInstrumentation: {
          dataAttributeName: 'data-foo-bar',
        },
      } as any,
    };
  });

  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('starts a new user action when none exists', () => {
    getCurrentSpy.mockReturnValue(undefined);
    const { processUserEvent } = getUserEventHandler(faro as Faro);

    const element = document.createElement('div');
    element.dataset['fooBar'] = 'my-action';
    const event = { type: 'click', target: element } as unknown as PointerEvent;

    processUserEvent(event);

    expect(startSpy).toHaveBeenCalledWith('my-action', {}, { triggerName: 'click' });
  });

  it('does not start a new action if one already exists', () => {
    getCurrentSpy.mockReturnValue(fakeAction);
    const { processUserEvent } = getUserEventHandler(faro as Faro);

    const event = { type: 'keydown', target: document.createElement('div') } as unknown as KeyboardEvent;
    processUserEvent(event);

    expect(startSpy).not.toHaveBeenCalled();
  });

  it('does not process an event if the current user action is in Started/Halted state', () => {
    fakeAction.getState.mockReturnValueOnce(UserActionState.Cancelled);
    getCurrentSpy.mockReturnValue(fakeAction);
    const { processUserEvent } = getUserEventHandler(faro as Faro);

    const element = document.createElement('div');
    element.setAttribute('data-faro-user-action-name', 'foo');
    const event = { type: 'keydown', target: element } as unknown as KeyboardEvent;
    processUserEvent(event);
    expect(fakeAction.extend).not.toHaveBeenCalled();
  });

  it('does not allow processing if there are no running requests', () => {
    getCurrentSpy.mockReturnValue(fakeAction);
    const { processUserEvent } = getUserEventHandler(faro as Faro);

    const event = { type: 'keydown', target: document.createElement('div') } as unknown as KeyboardEvent;
    processUserEvent(event);
    fakeAction.getState.mockReturnValue(UserActionState.Halted);

    httpObservable.notify({
      type: MESSAGE_TYPE_HTTP_REQUEST_START,
      request: {
        requestId: 'foo',
        url: '/bar',
        method: 'POST',
        apiType: 'xhr',
      },
    });
    expect(fakeAction.extend).not.toHaveBeenCalled();
  });
});
