import { dateNow, deepEqual, EVENT_OVERRIDES_SERVICE_NAME, faro, genShortID, isEmpty } from '@grafana/faro-core';
import type { Meta, MetaOverrides } from '@grafana/faro-core';

import { isLocalStorageAvailable, isSessionStorageAvailable } from '../../../utils';

import { isSampled } from './sampling';
import { SESSION_EXPIRATION_TIME, SESSION_INACTIVITY_TIME } from './sessionConstants';
import type { FaroUserSession, SessionManager } from './types';

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
      attributes: removeUndefinedValues({
        ...faro.config.sessionTracking?.session?.attributes,
        ...(faro.metas.value.session?.attributes ?? {}),
        isSampled: newSession.isSampled.toString(),
      }),
    },
  };

  const overrides = faro.metas.value.session?.overrides ?? previousSession?.sessionMeta?.overrides;
  if (!isEmpty(overrides)) {
    sessionWithMeta.sessionMeta.overrides = overrides;
  }

  const previousSessionId = previousSession?.sessionId;
  if (previousSessionId != null) {
    sessionWithMeta.sessionMeta.attributes!['previousSession'] = previousSessionId;
  }

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
  let isSyncing = false;

  return function syncSessionIfChangedExternally(meta: Meta) {
    if (isSyncing) {
      return;
    }
    const session = meta.session;
    const sessionFromSessionStorage = fetchUserSession();

    let sessionId = session?.id;
    const sessionAttributes = session?.attributes;
    const sessionOverrides = session?.overrides;

    const storedSessionMeta = sessionFromSessionStorage?.sessionMeta;
    const storedSessionMetaOverrides = storedSessionMeta?.overrides;

    const hasSessionOverridesChanged = !!sessionOverrides && !deepEqual(sessionOverrides, storedSessionMetaOverrides);
    const hasAttributesChanged = !!sessionAttributes && !deepEqual(sessionAttributes, storedSessionMeta?.attributes);
    const hasSessionIdChanged = !!session && sessionId !== sessionFromSessionStorage?.sessionId;

    if (hasSessionIdChanged || hasAttributesChanged || hasSessionOverridesChanged) {
      const userSession = addSessionMetadataToNextSession(
        createUserSessionObject({ sessionId, isSampled: isSampled() }),
        sessionFromSessionStorage
      );

      storeUserSession(userSession);
      sendOverrideEvent(hasSessionOverridesChanged, sessionOverrides, storedSessionMetaOverrides);

      isSyncing = true;
      try {
        faro.api.setSession(userSession.sessionMeta);
      } finally {
        isSyncing = false;
      }
    }
  };
}

/**
 * Force the *current* session to be treated as not-sampled, in place.
 *
 * This is used by the remote-config defer-and-buffer lifecycle: the session was created keep-all
 * (`isSampled='true'`) so its before-send hook never pre-drops while the remote rate is resolving.
 * Once the remote decision lands as "not sampled", we flip the live session so the existing session
 * before-send hook drops all subsequent items for this session.
 *
 * Critically this does NOT:
 * - create a new session id (the current session continues), or
 * - go through `faro.api.setSession` (which would trigger the meta update handler and re-derive the
 *   sampling decision probabilistically via `isSampled()`, undoing the forced value).
 *
 * Instead it mutates the live session meta attributes in place (items snapshot `metas.value` at send
 * time, so subsequent items observe the change) and persists `isSampled=false` to the stored session
 * so resumes/updates keep the same decision.
 *
 * The active `SessionManager` (volatile or persistent) is passed in by the caller to avoid a circular
 * dependency between this module and `getSessionManagerByConfig`.
 */
export function markSessionNotSampled(SessionManager: SessionManager): void {
  const liveSession = faro.metas?.value?.session;

  if (liveSession != null) {
    liveSession.attributes = {
      ...(liveSession.attributes ?? {}),
      isSampled: 'false',
    };
  }

  const sessionTrackingConfig = faro.config?.sessionTracking;
  const isPersistentSessions = sessionTrackingConfig?.persistent;

  if ((isPersistentSessions && !isLocalStorageAvailable) || (!isPersistentSessions && !isSessionStorageAvailable)) {
    return;
  }

  const storedSession = SessionManager.fetchUserSession();

  if (storedSession != null) {
    SessionManager.storeUserSession({
      ...storedSession,
      isSampled: false,
      sessionMeta: storedSession.sessionMeta
        ? {
            ...storedSession.sessionMeta,
            attributes: {
              ...(storedSession.sessionMeta.attributes ?? {}),
              isSampled: 'false',
            },
          }
        : storedSession.sessionMeta,
    });
  }
}

function removeUndefinedValues(obj: Record<string, string | undefined>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

function sendOverrideEvent(
  hasSessionOverridesChanged: boolean,
  sessionOverrides: MetaOverrides = {},
  storedSessionOverrides: MetaOverrides = {}
) {
  if (!hasSessionOverridesChanged) {
    return;
  }

  const serviceName = sessionOverrides.serviceName;
  const previousServiceName = storedSessionOverrides.serviceName ?? faro.metas.value.app?.name ?? '';

  if (serviceName && serviceName !== previousServiceName) {
    faro.api.pushEvent(EVENT_OVERRIDES_SERVICE_NAME, {
      serviceName,
      previousServiceName,
    });
  }
}
