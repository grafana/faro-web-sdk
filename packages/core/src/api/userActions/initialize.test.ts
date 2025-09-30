import { faro, UserActionImportance } from '../..';
import { mockConfig, mockInternalLogger } from '../../testUtils';
import { mockTransports } from '../apiTestHelpers';

import { initializeUserActionsAPI } from './initialize';
import { UserActionsAPI } from './types';
import UserAction from './userAction';

jest.mock('../../sdk/registerFaro', () => ({
  faro: {
    api: {
      pushEvent: jest.fn(),
    },
  },
}));

describe('initializeUserActionsAPI', () => {
  let transports;
  let config;
  let internalLogger;
  let api: UserActionsAPI;

  beforeEach(() => {
    transports = mockTransports;
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    config = mockConfig({
      trackUserActionsExcludeItem: jest.fn(),
    });
    internalLogger = mockInternalLogger;
    api = initializeUserActionsAPI({ transports, config, internalLogger });
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

    activeAction?.end();

    expect(faro.api.pushEvent).toHaveBeenCalledTimes(1);
    expect(faro.api.pushEvent).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ userActionImportance: 'critical', userActionTrigger: 'foo' }),
      undefined,
      expect.any(Object)
    );
  });

  it('startUserAction has custom severity (converts to importance) and trigger set', () => {
    const action = api.startUserAction('first', undefined, {
      severity: UserActionImportance.Critical,
      triggerName: 'foo',
    });
    expect(action).toBeInstanceOf(UserAction);

    const activeAction = api.getActiveUserAction();
    expect(activeAction).toBe(action);

    activeAction?.end();

    expect(faro.api.pushEvent).toHaveBeenCalledTimes(1);
    expect(faro.api.pushEvent).toHaveBeenCalledWith(
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

  it('create an action while one is halted will result action not getting created', () => {
    const a1 = api.startUserAction('A');
    expect(a1).toBeDefined();
    a1?.halt();
    const a2 = api.startUserAction('B');
    expect(a2).not.toBeDefined();
  });

  it('getActiveUserAction returns undefined if the action is ended', () => {
    const action = api.startUserAction('first');
    action?.end();
    expect(api.getActiveUserAction()).toBeUndefined();
  });

  it('getActiveUserAction returns undefined if the action is cancelled', () => {
    const action = api.startUserAction('first');
    action?.cancel();
    expect(api.getActiveUserAction()).toBeUndefined();
  });
});
