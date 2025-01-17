import { dateNow, deepEqual, faro, genShortID, Meta } from '@grafana/faro-core';

import { isLocalStorageAvailable, isSessionStorageAvailable } from '../../../utils';

import { isSampled } from './sampling';
import { SESSION_EXPIRATION_TIME, SESSION_INACTIVITY_TIME } from './sessionConstants';
import type { FaroUserSession } from './types';

type CreateUserSessionObjectParams = {
  sessionId?: string;
  started?: number;
  lastActivity?: number;
  isSampled?: boolean;
};

export function createUserSessionObject({
  sessionId,
  started,
  lastActivity,
  isSampled = true,
}: CreateUserSessionObjectParams = {}): FaroUserSession {
  const now = dateNow();

  const generateSessionId = faro.config?.sessionTracking?.generateSessionId;

  if (sessionId == null) {
    sessionId = typeof generateSessionId === 'function' ? generateSessionId() : genShortID();
  }

  return {
    sessionId,
    lastActivity: lastActivity ?? now,
    started: started ?? now,
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

type UpdateSessionParams = { forceSessionExtend: boolean };

export function getUserSessionUpdater({
  fetchUserSession,
  storeUserSession,
}: GetUserSessionUpdaterParams): (options?: UpdateSessionParams) => void {
  return function updateSession({ forceSessionExtend } = { forceSessionExtend: false }): void {
    if (!fetchUserSession || !storeUserSession) {
      return;
    }

    const sessionTrackingConfig = faro.config.sessionTracking;
    const isPersistentSessions = sessionTrackingConfig?.persistent;

    if ((isPersistentSessions && !isLocalStorageAvailable) || (!isPersistentSessions && !isSessionStorageAvailable)) {
      return;
    }

    const sessionFromStorage = fetchUserSession();

    if (forceSessionExtend === false && isUserSessionValid(sessionFromStorage)) {
      storeUserSession({ ...sessionFromStorage!, lastActivity: dateNow() });
    } else {
      let newSession = addSessionMetadataToNextSession(
        createUserSessionObject({ isSampled: isSampled() }),
        sessionFromStorage
      );

      storeUserSession(newSession);

      faro.api?.setSession(newSession.sessionMeta);
      sessionTrackingConfig?.onSessionChange?.(sessionFromStorage?.sessionMeta ?? null, newSession.sessionMeta!);
    }
  };
}

export function addSessionMetadataToNextSession(newSession: FaroUserSession, previousSession: FaroUserSession | null) {
  const sessionWithMeta: Required<FaroUserSession> = {
    ...newSession,
    sessionMeta: {
      id: newSession.sessionId,
      attributes: {
        ...faro.config.sessionTracking?.session?.attributes,
        ...(faro.metas.value.session?.attributes ?? {}),
        ...(previousSession != null ? { previousSession: previousSession.sessionId } : {}),
        isSampled: newSession.isSampled.toString(),
      },
    },
  };

  return sessionWithMeta;
}

type GetUserSessionMetaUpdateHandlerParams = {
  storeUserSession: (session: FaroUserSession) => void;
  fetchUserSession: () => FaroUserSession | null;
};

export function getSessionMetaUpdateHandler({
  fetchUserSession,
  storeUserSession,
}: GetUserSessionMetaUpdateHandlerParams) {
  return function syncSessionIfChangedExternally(meta: Meta) {
    //   const session = meta.session;
    //   const sessionFromSessionStorage = fetchUserSession();
    //   const { id: metaSessionId, attributes: metaAttributes } = session ?? {};
    //   const { sessionId: sessionFromStorageId, sessionMeta: sessionFromStorageMeta } = sessionFromSessionStorage ?? {};
    //   const sessionFromStorageMetaAttributes = sessionFromStorageMeta?.attributes;
    //   const sessionIdsIdentical = session?.id === sessionFromStorageId;
    //   const attributesIdentical = deepEqual(metaAttributes, sessionFromStorageMetaAttributes);
    //   const internalSessionAttributesIdentical = deepEqual(session?.internal, sessionFromStorageMeta?.internal);
    //   if (sessionIdsIdentical && attributesIdentical && internalSessionAttributesIdentical) {
    //     return;
    //   }
    //   const sessionIdManuallyUpdated = metaSessionId && metaSessionId !== sessionFromStorageId;
    //   const attributesManuallyUpdated = Boolean(
    //     metaAttributes && !deepEqual(metaAttributes, sessionFromStorageMetaAttributes)
    //   );
    //   if (sessionIdManuallyUpdated || attributesManuallyUpdated) {
    //     let sessionId = metaSessionId;
    //     if (sessionId == null && isUserSessionValid(sessionFromSessionStorage)) {
    //       sessionId = sessionFromSessionStorage?.sessionId;
    //     }
    //     const userSession = addSessionMetadataToNextSession(
    //       createUserSessionObject({ sessionId, isSampled: isSampled() }),
    //       sessionFromSessionStorage
    //     );
    //     storeUserSession(userSession);
    //     faro.api.setSession(userSession.sessionMeta);
    //   }
    // };

    const session = meta.session;
    const sessionFromSessionStorage = fetchUserSession();

    let sessionId = session?.id;

    if (
      (session && session.id !== sessionFromSessionStorage?.sessionId) ||
      (session?.attributes && !deepEqual(session?.attributes, sessionFromSessionStorage?.sessionMeta?.attributes))
    ) {
      if (sessionId == null && isUserSessionValid(sessionFromSessionStorage)) {
        sessionId = sessionFromSessionStorage?.sessionId;
      }

      const userSession = addSessionMetadataToNextSession(
        createUserSessionObject({ sessionId, isSampled: isSampled() }),
        sessionFromSessionStorage
      );

      storeUserSession(userSession);
      faro.api.setSession(userSession.sessionMeta);
    }
  };
}
