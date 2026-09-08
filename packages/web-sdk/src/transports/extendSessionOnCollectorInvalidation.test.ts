import type { Metas } from '@grafana/faro-core';
import { mockConfig } from '@grafana/faro-core/src/testUtils';

import * as sessionManagerMock from '../instrumentations/session/sessionManager';
import * as samplingModule from '../instrumentations/session/sessionManager/sampling';
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
    const transport = {
      config,
      metas: { value: { session: { id: 'stale-session' } } } as Metas,
    };

    extendSessionOnCollectorInvalidation(config, 'stale-session', transport, logDebug);

    expect(mockUpdateSession).toHaveBeenCalledTimes(1);
    expect(mockUpdateSession).toHaveBeenCalledWith({
      forceSessionExtend: true,
      invalidatedSessionId: 'stale-session',
    });
  });

  it('delegates stale-session skipping to the shared session updater', () => {
    const config = mockConfig({
      sessionTracking: {
        enabled: true,
        persistent: false,
      },
    });
    const transport = {
      config,
      metas: { value: { session: { id: 'new-session' } } } as Metas,
    };
    const storeUserSession = jest.fn();

    jest.restoreAllMocks();
    jest.spyOn(sessionManagerMock, 'getSessionManagerByConfig').mockReturnValue({
      fetchUserSession: jest.fn(),
      storeUserSession,
    } as unknown as ReturnType<typeof sessionManagerMock.getSessionManagerByConfig>);
    jest.spyOn(samplingModule, 'isSampled').mockReturnValue(true);

    extendSessionOnCollectorInvalidation(config, 'stale-session', transport, logDebug);

    expect(storeUserSession).not.toHaveBeenCalled();
  });
});
