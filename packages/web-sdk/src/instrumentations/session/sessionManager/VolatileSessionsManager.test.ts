import * as faroCore from '@grafana/faro-core';
import { faro, initializeFaro } from '@grafana/faro-core';
import { mockConfig } from '@grafana/faro-core/src/testUtils';

import * as samplingModule from './sampling';
import { SESSION_EXPIRATION_TIME, SESSION_INACTIVITY_TIME, STORAGE_KEY } from './sessionConstants';
import type { FaroUserSession } from './types';
import { VolatileSessionsManager } from './VolatileSessionManager';

const fakeSystemTime = new Date('2023-01-01').getTime();
const mockInitialSessionId = '123';

describe('Volatile Sessions Manager.', () => {
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
        enabled: true,
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

  afterEach(() => {
    jest.spyOn(samplingModule, 'isSampled').mockRestore();
  });

  afterAll(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();

    getItemSpy.mockRestore();
    setItemSpy.mockRestore();
  });

  it('Updates last active timestamp for valid session.', () => {
    const validSession = {
      sessionId: mockInitialSessionId,
      lastActivity: fakeSystemTime,
      started: fakeSystemTime,
      isSampled: true,
    };

    mockStorage[STORAGE_KEY] = JSON.stringify(validSession);

    const { updateSession } = new VolatileSessionsManager();

    const nextActivityTimeAfterFiveSeconds = fakeSystemTime;
    jest.setSystemTime(nextActivityTimeAfterFiveSeconds);

    updateSession();

    expect(setItemSpy).toBeCalledTimes(1); // called on time in the init function and the in the onActivity func
    expect(mockStorage[STORAGE_KEY]).toBe(
      JSON.stringify({
        sessionId: mockInitialSessionId,
        lastActivity: nextActivityTimeAfterFiveSeconds,
        started: fakeSystemTime,
        isSampled: true,
      })
    );
  });

  it('Creates a new faro user session if (old) session max inactivity duration is reached.', () => {
    const storedSession = {
      sessionId: mockInitialSessionId,
      lastActivity: fakeSystemTime,
      started: fakeSystemTime,
      isSampled: true,
    };

    mockStorage[STORAGE_KEY] = JSON.stringify(storedSession);

    const { updateSession } = new VolatileSessionsManager();

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
        isSampled: 'true',
      },
    };
    expect(session).toStrictEqual({
      sessionId: mockNewSessionId,
      lastActivity: maxActivityTimeReached,
      started: maxActivityTimeReached,
      isSampled: true,
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
      isSampled: true,
    };

    const { updateSession } = new VolatileSessionsManager();

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
        isSampled: 'true',
      },
    };
    expect(session).toStrictEqual({
      sessionId: mockNewSessionId,
      lastActivity: maxActivityTimeReached,
      started: maxActivityTimeReached,
      isSampled: true,
      sessionMeta: matchNewSessionMeta,
    });

    // Updates session meta
    expect(faro.metas.value.session).toStrictEqual(matchNewSessionMeta);

    // Call session created hook
    expect(mockOnNewSessionCreated).toHaveBeenCalledTimes(1);
    expect(mockOnNewSessionCreated).toHaveBeenCalledWith(oldStoredMeta, matchNewSessionMeta);
  });

  it('Creates a new Faro user session if setSession() is called outside the Faro session manager.', () => {
    const mockIsSampled = jest.fn();
    jest.spyOn(samplingModule, 'isSampled').mockImplementation(mockIsSampled);

    const storedSession = {
      sessionId: mockInitialSessionId,
      isSampled: true,
    };

    mockStorage[STORAGE_KEY] = JSON.stringify(storedSession);

    new VolatileSessionsManager();

    const initialSession: FaroUserSession = JSON.parse(mockStorage[STORAGE_KEY]!);
    expect(initialSession.sessionId).toBe(mockInitialSessionId);

    const manualSetSessionId = 'xyz';
    faro.api.setSession({ id: manualSetSessionId });
    expect(mockIsSampled).toHaveBeenCalledTimes(1);

    const newSession: FaroUserSession = JSON.parse(mockStorage[STORAGE_KEY]!);
    expect(newSession.sessionId).toBe(manualSetSessionId);
  });

  it('Stores in the locals storage even if it contains objects with circular references.', () => {
    const circularObject = { a: 'b' };
    (circularObject as any).circular = circularObject;

    const storedSession = {
      sessionId: mockInitialSessionId,
      isSampled: true,
      circularObject,
      lastActivity: fakeSystemTime,
      started: fakeSystemTime,
    };

    expect(() => {
      VolatileSessionsManager.storeUserSession(storedSession);
    }).not.toThrow();
  });
});
