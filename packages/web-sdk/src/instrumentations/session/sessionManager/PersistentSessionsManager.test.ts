import * as faroCore from '@grafana/faro-core';
import { faro, initializeFaro } from '@grafana/faro-core';
import { mockConfig } from '@grafana/faro-core/src/testUtils';

import { PersistentSessionsManager } from './PersistentSessionsManager';
import { SESSION_EXPIRATION_TIME, SESSION_INACTIVITY_TIME, STORAGE_KEY } from './sessionManagerUtils';

const fakeSystemTime = new Date('2023-01-01').getTime();
const mockInitialSessionId = '123';

describe('Persistent Sessions Manager.', () => {
  let mockStorage: Record<string, string> = {};
  let setItemSpy: jest.SpyInstance<void, [key: string, value: string]>;
  let getItemSpy: jest.SpyInstance<string | null, [key: string]>;

  let mockOnNewSessionCreated = jest.fn();

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(fakeSystemTime);

    setItemSpy = jest.spyOn(global.Storage.prototype, 'setItem').mockImplementation((key, value) => {
      mockStorage[key] = value;
    });

    getItemSpy = jest.spyOn(global.Storage.prototype, 'getItem').mockImplementation((key) => mockStorage[key] ?? null);

    const config = mockConfig({
      sessionTracking: {
        persistent: true,
        session: { id: mockInitialSessionId },
        onSessionChange: mockOnNewSessionCreated,
      },
    });

    initializeFaro(config);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage = {};
  });

  afterAll(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();

    getItemSpy.mockRestore();
    setItemSpy.mockRestore();
  });

  it('Crates a persistent-session-manager instance and initializes it with a new session.', () => {
    const manager = new PersistentSessionsManager(mockInitialSessionId);

    expect(typeof manager.updateSession).toBe('function');

    expect(setItemSpy).toHaveBeenCalledTimes(1);
    expect(mockStorage[STORAGE_KEY]).toBe(
      JSON.stringify({
        sessionId: mockInitialSessionId,
        lastActivity: fakeSystemTime,
        started: fakeSystemTime,
      })
    );
  });

  it('Updates last active timestamp for valid session.', () => {
    const validSession = {
      sessionId: mockInitialSessionId,
      lastActivity: fakeSystemTime,
      started: fakeSystemTime,
    };

    mockStorage[STORAGE_KEY] = JSON.stringify(validSession);

    const { updateSession } = new PersistentSessionsManager(mockInitialSessionId);

    const nextActivityTimeAfterFiveSeconds = fakeSystemTime;
    jest.setSystemTime(nextActivityTimeAfterFiveSeconds);

    updateSession();

    expect(setItemSpy).toBeCalledTimes(2); // called on time in the init function and the in the onActivity func
    expect(mockStorage[STORAGE_KEY]).toBe(
      JSON.stringify({
        sessionId: mockInitialSessionId,
        lastActivity: nextActivityTimeAfterFiveSeconds,
        started: fakeSystemTime,
      })
    );
  });

  it('Creates a new faro user session if (old) session max inactivity duration is reached.', () => {
    const storedSession = {
      sessionId: mockInitialSessionId,
      lastActivity: fakeSystemTime,
      started: fakeSystemTime,
    };

    mockStorage[STORAGE_KEY] = JSON.stringify(storedSession);

    const { updateSession } = new PersistentSessionsManager(mockInitialSessionId);

    const mockNewSessionId = 'abcde';
    jest.spyOn(faroCore, 'genShortID').mockReturnValue(mockNewSessionId);

    const maxActivityTimeReached = fakeSystemTime + SESSION_INACTIVITY_TIME;
    jest.setSystemTime(maxActivityTimeReached);

    updateSession();

    // creates and stores new session
    const session = JSON.parse(mockStorage[STORAGE_KEY]);

    const matchNewSessionMeta = {
      id: mockNewSessionId,
      attributes: {
        previousSession: mockInitialSessionId,
      },
    };
    expect(session).toStrictEqual({
      sessionId: mockNewSessionId,
      lastActivity: maxActivityTimeReached,
      started: maxActivityTimeReached,
      sessionMeta: matchNewSessionMeta,
    });

    // Updates session meta
    expect(faro.metas.value.session).toStrictEqual(matchNewSessionMeta);

    // Call session created hook
    expect(mockOnNewSessionCreated).toHaveBeenCalledTimes(1);
    expect(mockOnNewSessionCreated).toHaveBeenCalledWith(null, matchNewSessionMeta);
  });

  it('Creates a new faro user session if (old) session expiration time is reached.', () => {
    const oldStoredMeta = {
      id: 'aaaa',
      attributes: {
        previousSession: 'bbbb',
      },
    };
    const storedSession = {
      sessionId: mockInitialSessionId,
      lastActivity: fakeSystemTime,
      started: fakeSystemTime,
      sessionMeta: oldStoredMeta,
    };

    const { updateSession } = new PersistentSessionsManager(mockInitialSessionId);

    // overwrite auto created session
    mockStorage[STORAGE_KEY] = JSON.stringify(storedSession);

    const mockNewSessionId = 'abcde';
    jest.spyOn(faroCore, 'genShortID').mockReturnValue(mockNewSessionId);

    const maxActivityTimeReached = fakeSystemTime + SESSION_EXPIRATION_TIME;
    jest.setSystemTime(maxActivityTimeReached);

    updateSession();

    // creates and stores new session
    const session = JSON.parse(mockStorage[STORAGE_KEY]);

    const matchNewSessionMeta = {
      id: mockNewSessionId,
      attributes: {
        previousSession: mockInitialSessionId,
      },
    };
    expect(session).toStrictEqual({
      sessionId: mockNewSessionId,
      lastActivity: maxActivityTimeReached,
      started: maxActivityTimeReached,
      sessionMeta: matchNewSessionMeta,
    });

    // Updates session meta
    expect(faro.metas.value.session).toStrictEqual(matchNewSessionMeta);

    // Call session created hook
    expect(mockOnNewSessionCreated).toHaveBeenCalledTimes(1);
    expect(mockOnNewSessionCreated).toHaveBeenCalledWith(oldStoredMeta, matchNewSessionMeta);
  });
});
