import * as faroCore from '@grafana/faro-core';
import { initializeFaro } from '@grafana/faro-core';
import { mockConfig } from '@grafana/faro-core/src/testUtils';

import * as samplingModule from './sampling';
import { SESSION_EXPIRATION_TIME, SESSION_INACTIVITY_TIME } from './sessionConstants';
import {
  addSessionMetadataToNextSession,
  createUserSessionObject,
  getSessionMetaUpdateHandler,
  getUserSessionUpdater,
  isUserSessionValid,
} from './sessionManagerUtils';
import type { FaroUserSession } from './types';

const fakeSystemTime = new Date('2023-01-01').getTime();
const mockSessionId = '123';

describe('sessionManagerUtils', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(fakeSystemTime);
  });

  beforeEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  describe('createUserSessionObject', () => {
    it('creates new user session object', () => {
      jest.spyOn(faroCore, 'genShortID').mockReturnValueOnce(mockSessionId);

      const newSession = createUserSessionObject();

      expect(newSession).toStrictEqual({
        sessionId: mockSessionId,
        lastActivity: fakeSystemTime,
        started: fakeSystemTime,
        isSampled: true,
      });
    });

    it('creates with given sessionId', () => {
      const mockInitialSessionId = 'abcde';
      const newSession = createUserSessionObject({ sessionId: mockInitialSessionId });

      expect(newSession).toStrictEqual({
        sessionId: mockInitialSessionId,
        lastActivity: fakeSystemTime,
        started: fakeSystemTime,
        isSampled: true,
      });
    });

    it('creates with custom started and lastActivity', () => {
      const customStarted = fakeSystemTime - 1000;
      const customLastActivity = fakeSystemTime - 500;

      const newSession = createUserSessionObject({
        started: customStarted,
        lastActivity: customLastActivity,
      });

      expect(newSession.started).toBe(customStarted);
      expect(newSession.lastActivity).toBe(customLastActivity);
    });

    it('creates with custom isSampled value', () => {
      const newSession = createUserSessionObject({ isSampled: false });
      expect(newSession.isSampled).toBe(false);
    });

    it('uses user defined generateSessionId', () => {
      const customGeneratedSessionId = 'my-custom-id';

      const config = mockConfig({
        sessionTracking: {
          enabled: true,
          generateSessionId() {
            return customGeneratedSessionId;
          },
        },
      });

      initializeFaro(config);

      const newSession = createUserSessionObject();

      expect(newSession.sessionId).toBe(customGeneratedSessionId);
    });
  });

  describe('isUserSessionValid', () => {
    it('returns false if session is null', () => {
      const isValid = isUserSessionValid(null);
      expect(isValid).toBe(false);
    });

    it('returns false if activity timeout is reached', () => {
      const session = createUserSessionObject();
      session.lastActivity = fakeSystemTime - SESSION_INACTIVITY_TIME;

      const isValid = isUserSessionValid(session);
      expect(isValid).toBe(false);
    });

    it('returns false if lifetime timeout is reached', () => {
      const session = createUserSessionObject();
      session.started = fakeSystemTime - SESSION_EXPIRATION_TIME;

      const isValid = isUserSessionValid(session);
      expect(isValid).toBe(false);
    });

    it('returns true for valid session', () => {
      const session = createUserSessionObject();
      const isValid = isUserSessionValid(session);
      expect(isValid).toBe(true);
    });

    it('returns true if activity timeout is not reached', () => {
      const session = createUserSessionObject();
      session.lastActivity = fakeSystemTime - SESSION_INACTIVITY_TIME + 1000;

      const isValid = isUserSessionValid(session);
      expect(isValid).toBe(true);
    });

    it('returns true if lifetime timeout is not reached', () => {
      const session = createUserSessionObject();
      session.started = fakeSystemTime - SESSION_EXPIRATION_TIME + 1000;

      const isValid = isUserSessionValid(session);
      expect(isValid).toBe(true);
    });
  });

  describe('addSessionMetadataToNextSession', () => {
    it('adds metadata to session without previous session', () => {
      const config = mockConfig({});
      initializeFaro(config);

      const newSession: FaroUserSession = {
        lastActivity: 1,
        started: 2,
        sessionId: 'new-session-id',
        isSampled: true,
      };

      const sessionWithMetadata = addSessionMetadataToNextSession(newSession, null);

      expect(sessionWithMetadata).toStrictEqual({
        ...newSession,
        sessionMeta: {
          id: newSession.sessionId,
          attributes: {
            isSampled: 'true',
          },
        },
      });
    });

    it('adds previousSession attribute when previous session exists', () => {
      const config = mockConfig({});
      initializeFaro(config);

      const newSession: FaroUserSession = {
        lastActivity: 1,
        started: 2,
        sessionId: 'new-session-id',
        isSampled: true,
      };

      const previousSession: FaroUserSession = {
        lastActivity: 8,
        started: 9,
        sessionId: 'previous-session-id',
        isSampled: true,
      };

      const sessionWithMetadata = addSessionMetadataToNextSession(newSession, previousSession);

      expect(sessionWithMetadata).toStrictEqual({
        ...newSession,
        sessionMeta: {
          id: newSession.sessionId,
          attributes: {
            previousSession: previousSession.sessionId,
            isSampled: 'true',
          },
        },
      });
    });

    it('preserves existing session attributes from metas', () => {
      const config = mockConfig({});
      const { api } = initializeFaro(config);

      const newSession: FaroUserSession = {
        lastActivity: 1,
        started: 2,
        sessionId: 'new-session-id',
        isSampled: true,
      };

      const previousSession: FaroUserSession = {
        lastActivity: 8,
        started: 9,
        sessionId: 'previous-session-id',
        isSampled: true,
      };

      const sessionMeta = {
        id: previousSession.sessionId,
        attributes: {
          previousSession: '12345',
          foo: 'bar',
          baz: 'bam',
        },
      };

      api.setSession(sessionMeta);

      const sessionWithMetadata = addSessionMetadataToNextSession(newSession, previousSession);

      expect(sessionWithMetadata).toStrictEqual({
        ...newSession,
        sessionMeta: {
          id: newSession.sessionId,
          attributes: {
            ...sessionMeta.attributes,
            isSampled: 'true',
            previousSession: previousSession.sessionId,
          },
        },
      });
    });

    it('adds overrides from metas', () => {
      const config = mockConfig({});
      const { api } = initializeFaro(config);

      const newSession: FaroUserSession = {
        lastActivity: 1,
        started: 2,
        sessionId: 'new-session-id',
        isSampled: true,
      };

      const previousSession: FaroUserSession = {
        lastActivity: 8,
        started: 9,
        sessionId: 'previous-session-id',
        isSampled: true,
      };

      const overrides = {
        serviceName: 'my-service',
      };

      api.setSession(undefined, { overrides });

      const sessionWithOverrides = addSessionMetadataToNextSession(newSession, previousSession);

      expect(sessionWithOverrides).toStrictEqual({
        ...newSession,
        sessionMeta: {
          id: newSession.sessionId,
          overrides,
          attributes: {
            previousSession: previousSession.sessionId,
            isSampled: 'true',
          },
        },
      });
    });
  });

  describe('getUserSessionUpdater', () => {
    it('updates session when session is invalid', async () => {
      const mockOnSessionChange = jest.fn();
      const config = mockConfig({
        sessionTracking: {
          enabled: true,
          onSessionChange: mockOnSessionChange,
        },
      });

      initializeFaro(config);

      const mockFetchUserSession = jest.fn().mockResolvedValue(null);
      const mockStoreUserSession = jest.fn().mockResolvedValue(undefined);

      const updateSession = getUserSessionUpdater({
        fetchUserSession: mockFetchUserSession,
        storeUserSession: mockStoreUserSession,
      });

      jest.spyOn(faroCore, 'genShortID').mockReturnValueOnce(mockSessionId);
      jest.spyOn(samplingModule, 'isSampled').mockReturnValueOnce(true);

      await updateSession();

      expect(mockFetchUserSession).toHaveBeenCalledTimes(1);
      expect(mockStoreUserSession).toHaveBeenCalledTimes(1);
      expect(mockOnSessionChange).toHaveBeenCalledTimes(1);
    });

    it('extends existing valid session', async () => {
      const config = mockConfig({
        sessionTracking: {
          enabled: true,
        },
      });

      initializeFaro(config);

      const existingSession: FaroUserSession = {
        sessionId: mockSessionId,
        started: fakeSystemTime,
        lastActivity: fakeSystemTime - 1000,
        isSampled: true,
      };

      const mockFetchUserSession = jest.fn().mockResolvedValue(existingSession);
      const mockStoreUserSession = jest.fn().mockResolvedValue(undefined);

      const updateSession = getUserSessionUpdater({
        fetchUserSession: mockFetchUserSession,
        storeUserSession: mockStoreUserSession,
      });

      await updateSession();

      expect(mockStoreUserSession).toHaveBeenCalledWith({
        ...existingSession,
        lastActivity: fakeSystemTime,
      });
    });

    it('forces session extend when forceSessionExtend is true', async () => {
      const mockOnSessionChange = jest.fn();
      const config = mockConfig({
        sessionTracking: {
          enabled: true,
          onSessionChange: mockOnSessionChange,
        },
      });

      initializeFaro(config);

      const existingSession: FaroUserSession = {
        sessionId: 'old-session',
        started: fakeSystemTime,
        lastActivity: fakeSystemTime,
        isSampled: true,
      };

      const mockFetchUserSession = jest.fn().mockResolvedValue(existingSession);
      const mockStoreUserSession = jest.fn().mockResolvedValue(undefined);

      const updateSession = getUserSessionUpdater({
        fetchUserSession: mockFetchUserSession,
        storeUserSession: mockStoreUserSession,
      });

      jest.spyOn(faroCore, 'genShortID').mockReturnValueOnce(mockSessionId);
      jest.spyOn(samplingModule, 'isSampled').mockReturnValueOnce(true);

      await updateSession({ forceSessionExtend: true });

      expect(mockStoreUserSession).toHaveBeenCalledTimes(1);
      expect(mockOnSessionChange).toHaveBeenCalledTimes(1);

      // Should create new session, not extend existing
      const storedSession = mockStoreUserSession.mock.calls[0][0];
      expect(storedSession.sessionId).toBe(mockSessionId);
    });
  });

  describe('getSessionMetaUpdateHandler', () => {
    it('creates new session when session ID changes', async () => {
      initializeFaro(mockConfig({}));

      const mockFetchUserSession = jest.fn().mockResolvedValue(null);
      const mockStoreUserSession = jest.fn().mockResolvedValue(undefined);

      const handler = getSessionMetaUpdateHandler({
        fetchUserSession: mockFetchUserSession,
        storeUserSession: mockStoreUserSession,
      });

      jest.spyOn(samplingModule, 'isSampled').mockReturnValueOnce(true);

      const newSessionId = 'new-session-id';
      await handler({
        session: {
          id: newSessionId,
        },
      });

      expect(mockStoreUserSession).toHaveBeenCalledTimes(1);
      expect(mockStoreUserSession).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: newSessionId,
        })
      );
    });

    it('updates attributes without creating new session', async () => {
      const faro = initializeFaro(mockConfig({}));

      const storedSession: FaroUserSession = {
        sessionId: mockSessionId,
        isSampled: true,
        lastActivity: fakeSystemTime,
        started: fakeSystemTime,
        sessionMeta: {
          id: mockSessionId,
          attributes: {
            isSampled: 'true',
          },
        },
      };

      const mockFetchUserSession = jest.fn().mockResolvedValue(storedSession);
      const mockStoreUserSession = jest.fn().mockResolvedValue(undefined);

      const handler = getSessionMetaUpdateHandler({
        fetchUserSession: mockFetchUserSession,
        storeUserSession: mockStoreUserSession,
      });

      faro.api.setSession({
        id: mockSessionId,
        attributes: {
          isSampled: 'true',
          foo: 'bar',
        },
      });

      await handler(faro.metas.value);

      expect(mockStoreUserSession).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: mockSessionId,
          sessionMeta: expect.objectContaining({
            attributes: expect.objectContaining({
              foo: 'bar',
            }),
          }),
        })
      );
    });

    it('sends service name override event when service name changes', async () => {
      const faro = initializeFaro(
        mockConfig({
          app: {
            name: 'my-app',
            version: '1.0.0',
          },
        })
      );

      const mockFetchUserSession = jest.fn().mockResolvedValue(null);
      const mockStoreUserSession = jest.fn().mockResolvedValue(undefined);

      const handler = getSessionMetaUpdateHandler({
        fetchUserSession: mockFetchUserSession,
        storeUserSession: mockStoreUserSession,
      });

      const mockPushEvent = jest.fn();
      jest.spyOn(faro.api, 'pushEvent').mockImplementation(mockPushEvent);

      const newOverrides = { serviceName: 'my-service' };

      await handler({
        session: {
          id: mockSessionId,
          overrides: newOverrides,
        },
      });

      expect(mockPushEvent).toHaveBeenCalledWith('service_name_override', {
        serviceName: 'my-service',
        previousServiceName: 'my-app',
      });
    });
  });
});
