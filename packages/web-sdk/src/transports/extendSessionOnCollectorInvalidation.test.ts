import { mockConfig } from '@grafana/faro-core/src/testUtils';

import * as sessionManagerMock from '../instrumentations/session/sessionManager';
import * as sessionManagerUtilsMock from '../instrumentations/session/sessionManager/sessionManagerUtils';

import { extendSessionOnCollectorInvalidation } from './extendSessionOnCollectorInvalidation';

describe('extendSessionOnCollectorInvalidation', () => {
  const logDebug = jest.fn();
  const mockUpdateSession = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(sessionManagerMock, 'getSessionManagerByConfig').mockReturnValue({
      fetchUserSession: jest.fn(),
      storeUserSession: jest.fn(),
    } as unknown as ReturnType<typeof sessionManagerMock.getSessionManagerByConfig>);
    jest.spyOn(sessionManagerUtilsMock, 'getUserSessionUpdater').mockImplementation(() => mockUpdateSession);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('rotates when the invalidated session id matches the current session', () => {
    const config = mockConfig({
      sessionTracking: {
        enabled: true,
        persistent: false,
      },
    });

    extendSessionOnCollectorInvalidation(config, 'stale-session', () => 'stale-session', logDebug);

    expect(mockUpdateSession).toHaveBeenCalledTimes(1);
    expect(mockUpdateSession).toHaveBeenCalledWith({ forceSessionExtend: true });
  });

  it('skips rotation when the invalidated session id no longer matches the current session', () => {
    const config = mockConfig({
      sessionTracking: {
        enabled: true,
        persistent: false,
      },
    });

    extendSessionOnCollectorInvalidation(config, 'stale-session', () => 'new-session', logDebug);

    expect(mockUpdateSession).not.toHaveBeenCalled();
  });
});
