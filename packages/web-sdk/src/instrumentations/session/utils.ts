import { dateNow, genShortID } from '@grafana/faro-core';
import type { Faro } from '@grafana/faro-core';

import { isLocalStorageAvailable, isSessionStorageAvailable } from '../../utils/webStorage';

import { PersistentSessionsManager } from './PersistentSessionsManager';
import type { FaroUserSession } from './types';
import { VolatileSessionsManager } from './VolatileSessionManager';

// TODO: add tests

export const STORAGE_KEY = '__FARO_SESSION__';
export const SESSION_EXPIRATION_TIME = 4 * 60 * 60 * 1000; // hrs
export const SESSION_INACTIVITY_TIME = 15 * 60 * 1000; // minutes
export const STORAGE_UPDATE_DELAY = 1 * 1000; // seconds

export function createUserSessionObject(sessionId?: string): FaroUserSession {
  const now = dateNow();

  return {
    sessionId: sessionId ?? genShortID(),
    lastActivity: now,
    started: now,
  };
}

export function isUserSessionValid(session: FaroUserSession | null): boolean {
  if (session == null) {
    return false;
  }

  const now = dateNow();
  const lifetimeValid = now - session.started < SESSION_EXPIRATION_TIME;

  if (!lifetimeValid) {
    return false;
  }

  const inactivityPeriodValid = now - session.lastActivity < SESSION_INACTIVITY_TIME;
  return inactivityPeriodValid;
}

type GetUserSessionUpdaterParams = {
  storeUserSession: (session: FaroUserSession) => void;
  fetchUserSession: () => FaroUserSession | null;
  faro: Faro;
};

export function getUserSessionUpdater({
  fetchUserSession,
  storeUserSession,
  faro,
}: GetUserSessionUpdaterParams): () => void {
  return (): void => {
    if (!fetchUserSession || !storeUserSession) {
      return;
    }

    const sessionFromLocalStorage = fetchUserSession();

    if (isUserSessionValid(sessionFromLocalStorage)) {
      storeUserSession({ ...sessionFromLocalStorage!, lastActivity: dateNow() });
    } else {
      let newSession = createUserSessionObject(); // create local srorage session
      newSession = {
        ...newSession,
        sessionMeta: {
          id: newSession.sessionId,
          attributes: {
            ...(faro.metas.value.session?.attributes ?? {}),
            ...(sessionFromLocalStorage != null ? { previousSession: sessionFromLocalStorage.sessionId } : {}),
          },
        },
      };

      storeUserSession(newSession);

      faro.api?.setSession(newSession.sessionMeta);
      faro.config.experimentalSessions?.onSessionChange?.(
        sessionFromLocalStorage?.sessionMeta ?? null,
        newSession.sessionMeta!
      );
    }
  };
}

type GetSessionManagerInstanceByConfiguredStrategy = {
  initialSessionId?: string;
  faro: Faro;
};

export function getSessionManagerInstanceByConfiguredStrategy({
  initialSessionId,
  faro,
}: GetSessionManagerInstanceByConfiguredStrategy): PersistentSessionsManager | VolatileSessionsManager | null {
  if (faro.config.experimentalSessions?.persistent && isLocalStorageAvailable) {
    return new PersistentSessionsManager(initialSessionId);
  }

  if (isSessionStorageAvailable) {
    return new VolatileSessionsManager(initialSessionId);
  }

  return null;
}
