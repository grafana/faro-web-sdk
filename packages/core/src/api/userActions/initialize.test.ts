import { mockConfig } from '../../testUtils';
import { mockTransports } from '../apiTestHelpers';

import { initializeUserActionsAPI } from './initialize';
import { UserActionsAPI } from './types';
import { UserAction } from './userAction';

describe('initializeUserActionsAPI', () => {
  let transports;
  let config;
  let eventsAPI: { pushEvent: jest.Mock } | undefined;
  let api: UserActionsAPI;

  beforeEach(() => {
    transports = mockTransports;
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    ((config = mockConfig({
      trackUserActionsExcludeItem: jest.fn(),
    })),
      (eventsAPI = { pushEvent: jest.fn() }));
    api = initializeUserActionsAPI({ transports, config, eventsAPI });
  });

  it('getCurrentAction returns undefined before any action is created', () => {
    expect(api.getCurrentAction()).toBeUndefined();
  });

  it('startUserAction returns a new UserAction when none exists', () => {
    const action = api.startUserAction('first', 'test');
    expect(action).toBeInstanceOf(UserAction);
    expect(api.getCurrentAction()).toBe(action);
  });

  it('subsequent startUserAction calls return the same instance while it is active', () => {
    const a1 = api.startUserAction('A', 'test');
    const a2 = api.startUserAction('B', 'test');
    expect(a2).toBe(a1);
  });

  it('getCurrentAction returns the current action if started', () => {
    const action = api.startUserAction('first', 'test');
    expect(api.getCurrentAction()).toBe(action);
  });

  it('getCurrentAction returns undefined if the action is ended', () => {
    const action = api.startUserAction('first', 'test');
    action.end();
    expect(api.getCurrentAction()).toBeUndefined();
  });

  it('getCurrentAction returns undefined if the action is cancelled', () => {
    const action = api.startUserAction('first', 'test');
    action.cancel();
    expect(api.getCurrentAction()).toBeUndefined();
  });
});
