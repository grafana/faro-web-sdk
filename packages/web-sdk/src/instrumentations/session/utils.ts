import { dateNow, genShortID } from '@grafana/faro-core';
import type { Faro } from '@grafana/faro-core';

import type { FaroUserSession } from './types';

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

export function getUserSessionUpdater({
  fetchUserSession,
  storeUserSession,
  faro,
}: {
  storeUserSession: (session: FaroUserSession) => void;
  fetchUserSession: () => FaroUserSession | null;
  faro: Faro;
}): () => void {
  return () => {
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
