import { apiMessageBus, initializeFaro } from '@grafana/faro-core';
import type { Config, Faro, UserActionEndMessage } from '@grafana/faro-core';
import {
  USER_ACTION_CANCEL_MESSAGE_TYPE,
  USER_ACTION_END_MESSAGE_TYPE,
  USER_ACTION_START_MESSAGE_TYPE,
} from '@grafana/faro-core/src/api/const';
import { mockConfig } from '@grafana/faro-core/src/testUtils';

import { makeCoreConfig } from '../../config';

import { userActionDataAttribute } from './const';
import { getUserEventHandler } from './processUserActionEventHandler';

describe('UserActionsInstrumentation', () => {
  let mockFaro: Faro;

  beforeAll(() => {
    jest.useFakeTimers();
  });

  beforeEach(() => {
    jest.resetAllMocks();
    jest.clearAllTimers();

    mockFaro = initializeFaro(
      makeCoreConfig(
        mockConfig({
          trackUserActionsDataAttributeName: userActionDataAttribute,
          trackUserActions: true,
        })
      )
    );
  });

  afterAll(() => {
    jest.restoreAllMocks();
    jest.clearAllTimers();
  });

  it('Emits a user-action-end message if a user action has follow up activity within 100ms', () => {
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

    xhr.open('GET', 'https://www.grafana.com');
    xhr.send();

    jest.runAllTimers();

    expect(mockApiMessageBusNotify).toHaveBeenCalledTimes(2);
    expect(mockApiMessageBusNotify).toHaveBeenNthCalledWith(2, {
      type: USER_ACTION_END_MESSAGE_TYPE,
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
        userActionEventType: expect.any(String),
      }),
      undefined,
      expect.anything()
    );
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
      type: USER_ACTION_CANCEL_MESSAGE_TYPE,
      name: 'test-action',
      parentId: expect.any(String),
    });
  });

  it("Doesn't emit a user-action-start message when a user action starts on an element without a qualifying data- attribute", () => {
    const handler = getUserEventHandler({
      ...mockFaro,
      config: {} as Config,
    });

    const element = document.createElement('div');

    const mockApiMessageBusNotify = jest.fn();
    jest.spyOn(apiMessageBus, 'notify').mockImplementationOnce(mockApiMessageBusNotify);

    const pointerdownEvent = {
      type: 'pointerdown',
      target: element,
    } as unknown as PointerEvent;

    handler(pointerdownEvent);

    expect(mockApiMessageBusNotify).toHaveBeenCalledTimes(0);
  });

  it('Emits a user-action-start message when a user action starts', () => {
    const mockApiMessageBusNotify = jest.fn();
    jest.spyOn(apiMessageBus, 'notify').mockImplementationOnce(mockApiMessageBusNotify);

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
      type: USER_ACTION_START_MESSAGE_TYPE,
    });
  });
});
