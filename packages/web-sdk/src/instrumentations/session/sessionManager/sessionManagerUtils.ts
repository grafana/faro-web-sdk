import { dateNow, faro, genShortID } from '@grafana/faro-core';

import { isSampled } from './sampling';
import { SESSION_EXPIRATION_TIME, SESSION_INACTIVITY_TIME } from './sessionConstants';
import type { FaroUserSession } from './types';

type CreateUserSessionObjectParams = {
  sessionId?: string;
  isSampled?: boolean;
};

export function createUserSessionObject({
  sessionId = genShortID(),
  isSampled = true,
}: CreateUserSessionObjectParams = {}): FaroUserSession {
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
        createUserSessionObject({ isSampled: isSampled() }),
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
      attributes: {
        ...(faro.metas.value.session?.attributes ?? {}),
        // order matters, new session meta created with setSession() shall not overwrite attributes with the same name which were manually configured on initialize.
        ...faro.config.sessionTracking?.session?.attributes,
        // order matters, previousSession and  isSampled overwrites attributes from config with the same.
        ...(previousSession != null ? { previousSession: previousSession.sessionId } : {}),
        isSampled: newSession.isSampled.toString(),
      },
    },
  };

  return sessionWithMeta;
}

export function cleanUpSessionMetaAttributes(session: FaroUserSession): FaroUserSession {
  const { sessionMeta, ...sessionWithoutMeta } = session;
  const { previousSession } = sessionMeta?.attributes ?? {};

  if (!previousSession) {
    return sessionWithoutMeta;
  }

  return {
    ...sessionWithoutMeta,
    sessionMeta: {
      id: sessionMeta?.id,
      attributes: {
        previousSession,
      },
    },
  };
}
