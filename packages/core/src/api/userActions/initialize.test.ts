import { UserActionImportance } from '../..';
import { mockConfig, mockInternalLogger } from '../../testUtils';
import { mockTransports } from '../apiTestHelpers';

import { userActionEventName } from './const';
import { initializeUserActionsAPI } from './initialize';
import { UserActionInternalInterface, UserActionsAPI } from './types';
import UserAction from './userAction';

describe('initializeUserActionsAPI', () => {
  let transports;
  let config;
  let internalLogger;
  let api: UserActionsAPI;
  let mockPushEvent: jest.Mock;

  beforeEach(() => {
    transports = mockTransports;
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    config = mockConfig({
      userActionsInstrumentation: {
        excludeItem: jest.fn(),
      },
    });
    internalLogger = mockInternalLogger;
    mockPushEvent = jest.fn();
    api = initializeUserActionsAPI({ transports, config, internalLogger, pushEvent: mockPushEvent });
    jest.resetAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('getActiveUserAction returns undefined before any action is created', () => {
    expect(api.getActiveUserAction()).toBeUndefined();
  });

  it('startUserAction returns a new UserAction when none exists', () => {
    const action = api.startUserAction('first');
    expect(action).toBeInstanceOf(UserAction);
    expect(api.getActiveUserAction()).toBe(action);
  });

  it('startUserAction has custom importance and trigger set', () => {
    const action = api.startUserAction('first', undefined, {
      importance: UserActionImportance.Critical,
      triggerName: 'foo',
    });
    expect(action).toBeInstanceOf(UserAction);

    const activeAction = api.getActiveUserAction();
    expect(activeAction).toBe(action);

    (activeAction as unknown as UserActionInternalInterface)?.end();

    expect(mockPushEvent).toHaveBeenCalledTimes(1);
    expect(mockPushEvent).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ userActionImportance: 'critical', userActionTrigger: 'foo' }),
      undefined,
      expect.any(Object)
    );
  });

  it('subsequent startUserAction calls will return undefined as long as there is an action running', () => {
    api.startUserAction('A');
    const a2 = api.startUserAction('B');
    expect(a2).not.toBeDefined();
  });

  it('getActiveUserAction returns undefined if the action is ended', () => {
    const action = api.startUserAction('first');
    (action as unknown as UserActionInternalInterface)?.end();
    expect(api.getActiveUserAction()).toBeUndefined();
  });

  it('getActiveUserAction returns undefined if the action is cancelled', () => {
    const action = api.startUserAction('first');
    (action as unknown as UserActionInternalInterface)?.cancel();
    expect(api.getActiveUserAction()).toBeUndefined();
  });

  it('user action has proper event name and contains all necessary attributes', () => {
    const action = api.startUserAction(
      'test-action',
      { foo: 'bar' },
      { importance: UserActionImportance.Critical, triggerName: 'foo' }
    );
    (action as unknown as UserActionInternalInterface)?.end();

    expect(mockPushEvent).toHaveBeenCalledWith(
      userActionEventName,
      expect.objectContaining({
        userActionName: 'test-action',
        userActionDuration: expect.any(String),
        userActionImportance: 'critical',
        userActionStartTime: expect.any(String),
        userActionEndTime: expect.any(String),
        userActionTrigger: 'foo',
        foo: 'bar',
      }),
      undefined,
      expect.any(Object)
    );
  });
});
