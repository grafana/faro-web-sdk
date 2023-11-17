import { dateNow, faro, genShortID } from '@grafana/faro-core';

import { isSampled } from './sampling';
import { SESSION_EXPIRATION_TIME, SESSION_INACTIVITY_TIME } from './sessionConstants';
import type { FaroUserSession } from './types';

// TODO: use params object
export function createUserSessionObject(sessionId: string = genShortID(), isSampled = false): FaroUserSession {
  const now = dateNow();

  return {
    sessionId,
    lastActivity: now,
    started: now,
    isSampled: isSampled,
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
  return function updateSession(): void {
    if (!fetchUserSession || !storeUserSession) {
      return;
    }

    const sessionFromStorage = fetchUserSession();

    if (isUserSessionValid(sessionFromStorage)) {
      storeUserSession({ ...sessionFromStorage!, lastActivity: dateNow() });
    } else {
      let newSession = addSessionMetadataToNextSession(
        createUserSessionObject(undefined, isSampled()),
        sessionFromStorage
      );

      storeUserSession(newSession);

      faro.api?.setSession(newSession.sessionMeta);
      faro.config.sessionTracking?.onSessionChange?.(sessionFromStorage?.sessionMeta ?? null, newSession.sessionMeta!);
    }
  };
}

export function addSessionMetadataToNextSession(newSession: FaroUserSession, previousSession: FaroUserSession | null) {
  const sessionWithMeta: Required<FaroUserSession> = {
    ...newSession,
    sessionMeta: {
      id: newSession.sessionId,
    },
  };

  const metaAttributes = faro.metas.value.session?.attributes;
  if (metaAttributes || previousSession != null) {
    sessionWithMeta.sessionMeta.attributes = {
      ...(metaAttributes ?? {}),
      ...(previousSession != null ? { previousSession: previousSession.sessionId } : {}),
    };
  }

  return sessionWithMeta;
}
