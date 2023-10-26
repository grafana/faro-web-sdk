import { dateNow, faro, genShortID } from '@grafana/faro-core';

import type { FaroUserSession } from './types';

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
};

export function getUserSessionUpdater({ fetchUserSession, storeUserSession }: GetUserSessionUpdaterParams): () => void {
  return (): void => {
    if (!fetchUserSession || !storeUserSession) {
      return;
    }

    const sessionFromStorage = fetchUserSession();

    if (isUserSessionValid(sessionFromStorage)) {
      storeUserSession({ ...sessionFromStorage!, lastActivity: dateNow() });
    } else {
      let newSession = addSessionMetadataToNextSession(createUserSessionObject(), sessionFromStorage); // create local srorage session

      storeUserSession(newSession);

      faro.api?.setSession(newSession.sessionMeta);
      faro.config.experimentalSessions?.onSessionChange?.(
        sessionFromStorage?.sessionMeta ?? null,
        newSession.sessionMeta!
      );
    }
  };
}

export function addSessionMetadataToNextSession(newSession: FaroUserSession, previousSession: FaroUserSession | null) {
  return {
    ...newSession,
    sessionMeta: {
      id: newSession.sessionId,
      attributes: {
        ...(faro.metas.value.session?.attributes ?? {}),
        ...(previousSession != null ? { previousSession: previousSession.sessionId } : {}),
      },
    },
  };
}
