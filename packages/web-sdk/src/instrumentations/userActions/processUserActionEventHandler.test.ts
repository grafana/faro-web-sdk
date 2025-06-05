import {
  apiMessageBus,
  Config,
  initializeFaro,
  USER_ACTION_CANCEL,
  USER_ACTION_END,
  USER_ACTION_HALT,
  USER_ACTION_START,
} from '@grafana/faro-core';
import type { Faro, UserActionEndMessage, UserActionHaltMessage, UserActionStartMessage } from '@grafana/faro-core';
import { mockConfig } from '@grafana/faro-core/src/testUtils';

import { faro } from '../..';
import { makeCoreConfig } from '../../config';

import { userActionDataAttribute } from './const';
import { getUserEventHandler } from './processUserActionEventHandler';
import { ApiEvent } from './types';

class MockXMLHttpRequest {
  open() {}
  send() {
    this.onload({
      target: {
        responseText: JSON.stringify({ message: 'Mocked Response' }),
      },
    });
  }
  onload(_arg0: { target: { responseText: string } }) {}
  setRequestHeader() {}
  addEventListener(event: string, callback: () => void) {
    if (event === 'load') {
      callback();
    }
  }
}

const originalXMLHttpRequest = global.XMLHttpRequest;

describe('UserActionsInstrumentation', () => {
  let mockFaro: Faro;

  beforeAll(() => {
    jest.useFakeTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks(); // Clears call counts and instances
    jest.resetAllMocks(); // Resets mock implementations
    jest.restoreAllMocks(); // Restores spies to original methods
    jest.clearAllTimers();

    mockFaro = initializeFaro(
      makeCoreConfig(
        mockConfig({
          trackUserActionsDataAttributeName: userActionDataAttribute,
          trackUserActionsPreview: true,
        })
      )
    );
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
    jest.clearAllTimers();
    global.XMLHttpRequest = originalXMLHttpRequest;
  });

  it('Emits a user-action-end message if a user action has follow up activity within 100ms', () => {
    (global as any).XMLHttpRequest = MockXMLHttpRequest;

    const mockApiMessageBusNotify = jest.fn();
    jest.spyOn(apiMessageBus, 'notify').mockImplementation(mockApiMessageBusNotify);

    const mockPushEvent = jest.fn();
    jest.spyOn(mockFaro.api, 'pushEvent').mockImplementation(mockPushEvent);

    const handler = getUserEventHandler(mockFaro);

    const element = document.createElement('div');
    element.setAttribute(userActionDataAttribute, 'test-action');

    const pointerdownEvent = {
      type: 'pointerdown',
      target: element,
    } as unknown as PointerEvent;

    const xhr = new XMLHttpRequest();

    handler(pointerdownEvent);

    // TODO: need to ensure that we end a request maybe mock teh httpMonitor or resource instrumentation
    xhr.open('GET', 'https://www.grafana.com');
    xhr.send();

    jest.runAllTimers();

    expect(mockApiMessageBusNotify).toHaveBeenCalledTimes(2);

    expect(mockApiMessageBusNotify).toHaveBeenNthCalledWith(1, {
      type: USER_ACTION_START,
      name: 'test-action',
      parentId: expect.any(String),
      startTime: expect.any(Number),
    } as UserActionStartMessage);

    expect(mockApiMessageBusNotify).toHaveBeenNthCalledWith(2, {
      type: USER_ACTION_END,
      name: 'test-action',
      id: expect.any(String),
      startTime: expect.any(Number),
      endTime: expect.any(Number),
      duration: expect.any(Number),
      eventType: 'pointerdown',
    } as UserActionEndMessage);

    expect(mockPushEvent).toHaveBeenCalledTimes(1);

    expect(mockPushEvent).toHaveBeenCalledWith(
      'test-action',
      expect.objectContaining({
        userActionStartTime: expect.any(String),
        userActionEndTime: expect.any(String),
        userActionDuration: expect.any(String),
        userActionEventTrigger: expect.any(String),
      }),
      undefined,
      expect.anything()
    );

    global.XMLHttpRequest = originalXMLHttpRequest;
  });

  it('Emits a user-action-cancel message if a user action has no follow up activity within 100ms', () => {
    const mockApiMessageBusNotify = jest.fn();
    jest.spyOn(apiMessageBus, 'notify').mockImplementation(mockApiMessageBusNotify);

    jest.mock('./httpRequestMonitor', () => ({
      monitorHttpRequests: jest.fn().mockReturnValue({
        subscribe: jest.fn(),
      }),
    }));

    jest.mock('./domMutationMonitor', () => ({
      monitorDomMutations: jest.fn().mockReturnValue({
        subscribe: jest.fn(),
      }),
    }));

    jest.mock('./performanceEntriesMonitor', () => ({
      monitorPerformanceEntries: jest.fn().mockReturnValue({
        subscribe: jest.fn(),
      }),
    }));

    const handler = getUserEventHandler(mockFaro);

    const element = document.createElement('div');
    element.setAttribute(userActionDataAttribute, 'test-action');

    const pointerdownEvent = {
      type: 'pointerdown',
      target: element,
    } as unknown as PointerEvent;

    // no action happens so we do cancel the action

    handler(pointerdownEvent);

    jest.runAllTimers();

    expect(mockApiMessageBusNotify).toHaveBeenCalledTimes(2);
    expect(mockApiMessageBusNotify).toHaveBeenNthCalledWith(2, {
      type: USER_ACTION_CANCEL,
      name: 'test-action',
      parentId: expect.any(String),
    });
  });

  it('Emits a user-action-halt message if pending requests are detected', () => {
    const mockApiMessageBusNotify = jest.fn();
    const spy = jest.spyOn(apiMessageBus, 'notify').mockImplementation(mockApiMessageBusNotify);

    const mockPushEvent = jest.fn();
    jest.spyOn(mockFaro.api, 'pushEvent').mockImplementation(mockPushEvent);

    const handler = getUserEventHandler(mockFaro);

    const element = document.createElement('div');
    element.setAttribute(userActionDataAttribute, 'test-action');

    const pointerdownEvent = {
      type: 'pointerdown',
      target: element,
    } as unknown as PointerEvent;
    const xhr = new XMLHttpRequest();

    handler(pointerdownEvent);

    // Here we didn't mock the request so it doesn't resolve. Means we only get a start message and no end message
    xhr.open('GET', 'https://www.grafana.com');
    xhr.send();

    jest.runAllTimers();

    expect(mockApiMessageBusNotify).toHaveBeenCalledTimes(3);

    expect(mockApiMessageBusNotify).toHaveBeenNthCalledWith(1, {
      type: USER_ACTION_START,
      name: 'test-action',
      parentId: expect.any(String),
      startTime: expect.any(Number),
    } as UserActionStartMessage);

    expect(mockApiMessageBusNotify).toHaveBeenNthCalledWith(2, {
      type: USER_ACTION_HALT,
      name: 'test-action',
      parentId: expect.any(String),
      reason: 'pending-requests',
      haltTime: expect.any(Number),
    } as UserActionHaltMessage);

    expect(mockApiMessageBusNotify).toHaveBeenNthCalledWith(3, {
      type: USER_ACTION_END,
      name: 'test-action',
      id: expect.any(String),
      startTime: expect.any(Number),
      endTime: expect.any(Number),
      duration: expect.any(Number),
      eventType: 'pointerdown',
    } as UserActionEndMessage);

    expect(mockPushEvent).toHaveBeenCalledTimes(1);

    expect(mockPushEvent).toHaveBeenCalledWith(
      'test-action',
      expect.objectContaining({
        userActionStartTime: expect.any(String),
        userActionEndTime: expect.any(String),
        userActionDuration: expect.any(String),
        userActionEventTrigger: expect.any(String),
      }),
      undefined,
      expect.anything()
    );

    spy.mockReset();
  });

  it("Doesn't emit a user-action-start message when a user action starts on an element without a qualifying data- attribute", () => {
    const handler = getUserEventHandler({
      ...mockFaro,
      config: {} as Config,
    });

    const element = document.createElement('div');

    const mockApiMessageBusNotify = jest.fn();
    const spy = jest.spyOn(apiMessageBus, 'notify').mockImplementationOnce(mockApiMessageBusNotify);

    const pointerdownEvent = {
      type: 'pointerdown',
      target: element,
    } as unknown as PointerEvent;

    handler(pointerdownEvent);

    expect(mockApiMessageBusNotify).toHaveBeenCalledTimes(0);

    spy.mockReset();
  });

  it('Emits a user-action-start message when a user action starts', () => {
    const mockApiMessageBusNotify = jest.fn();
    const spy = jest.spyOn(apiMessageBus, 'notify').mockImplementationOnce(mockApiMessageBusNotify);

    const handler = getUserEventHandler(mockFaro);

    const element = document.createElement('div');
    element.setAttribute(userActionDataAttribute, 'test-action');

    const pointerdownEvent = {
      type: 'pointerdown',
      target: element,
    } as unknown as PointerEvent;

    handler(pointerdownEvent);

    expect(mockApiMessageBusNotify).toHaveBeenCalledTimes(1);
    expect(mockApiMessageBusNotify).toHaveBeenCalledWith({
      name: 'test-action',
      parentId: expect.any(String),
      startTime: expect.any(Number),
      type: USER_ACTION_START,
    });

    spy.mockReset();
  });

  it('Creates a users action from an api event', () => {
    const mockPushEvent = jest.fn();
    const spy = jest.spyOn(faro.api, 'pushEvent').mockImplementationOnce(mockPushEvent);

    const handler = getUserEventHandler(mockFaro);

    const apiEvent: ApiEvent = {
      type: 'apiEvent',
      name: 'test-action',
      attributes: { foo: 'bar' },
    };

    const xhr = new XMLHttpRequest();

    handler(apiEvent);

    // TODO: need to ensure that we end a request maybe mock teh httpMonitor or resource instrumentation
    xhr.open('GET', 'https://www.grafana.com');
    xhr.send();

    jest.runAllTimers();

    expect(mockPushEvent).toHaveBeenCalledTimes(1);
    expect(mockPushEvent).toHaveBeenCalledWith(
      'test-action',
      expect.objectContaining({
        userActionStartTime: expect.any(String),
        userActionEndTime: expect.any(String),
        userActionDuration: expect.any(String),
        userActionEventTrigger: expect.any(String),
      }),
      undefined,
      expect.anything()
    );

    spy.mockReset();
  });
});
