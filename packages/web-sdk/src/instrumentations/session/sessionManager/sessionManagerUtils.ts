import { dateNow, deepEqual, EVENT_OVERRIDES_SERVICE_NAME, faro, genShortID, isEmpty } from '@grafana/faro-core';
import type { Meta, MetaOverrides } from '@grafana/faro-core';

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
  // Silently adopt another tab's session into in-memory metas (cross-tab sync).
  // Optional: only the valid (non-force-extend) branch uses it.
  adoptSession?: (sessionMeta: NonNullable<FaroUserSession['sessionMeta']>) => void;
  updateInterval?: number;
};

type UpdateSessionParams = { forceSessionExtend?: boolean; refreshActivity?: boolean };

export function getUserSessionUpdater({
  fetchUserSession,
  storeUserSession,
  adoptSession,
  updateInterval = 0,
}: GetUserSessionUpdaterParams): (options?: UpdateSessionParams) => void {
  let nextUpdate = 0;
  return function updateSession({
    forceSessionExtend = false,
    refreshActivity = true,
  }: UpdateSessionParams = {}): void {
    if (!fetchUserSession || !storeUserSession) {
      return;
    }

    const now = dateNow();
    if (!forceSessionExtend && now < nextUpdate && nextUpdate - now <= updateInterval) {
      return;
    }

    const sessionTrackingConfig = faro.config.sessionTracking;
    const isPersistentSessions = sessionTrackingConfig?.persistent;

    if ((isPersistentSessions && !isLocalStorageAvailable) || (!isPersistentSessions && !isSessionStorageAvailable)) {
      return;
    }

    const sessionFromStorage = fetchUserSession();
    // Bound checks by both expiry deadlines. A backward clock adjustment must
    // not turn the storage interval into a long suspension of reconciliation.
    nextUpdate = Math.min(
      now + updateInterval,
      (sessionFromStorage?.started ?? now) + SESSION_EXPIRATION_TIME,
      (sessionFromStorage?.lastActivity ?? now) + SESSION_INACTIVITY_TIME
    );

    if (forceSessionExtend === false && isUserSessionValid(sessionFromStorage)) {
      if (refreshActivity) {
        storeUserSession({ ...sessionFromStorage!, lastActivity: now });
      }

      // Another tab rotated the shared session; adopt it so we stop emitting the stale id.
      const inMemorySessionId = faro.metas.value.session?.id;
      if (
        adoptSession != null &&
        sessionFromStorage!.sessionMeta != null &&
        sessionFromStorage!.sessionId !== inMemorySessionId
      ) {
        adoptSession(sessionFromStorage!.sessionMeta);
      }
    } else {
      let newSession = addSessionMetadataToNextSession(
        createUserSessionObject({ isSampled: isSampled() }),
        sessionFromStorage
      );
      nextUpdate = now + updateInterval;

      storeUserSession(newSession);

      faro.api?.setSession(newSession.sessionMeta);
      sessionTrackingConfig?.onSessionChange?.(sessionFromStorage?.sessionMeta ?? null, newSession.sessionMeta!);
    }
  };
}

export function getUserSessionActivityRecorder({
  fetchUserSession,
  storeUserSession,
  updateInterval = 0,
}: Pick<GetUserSessionUpdaterParams, 'fetchUserSession' | 'storeUserSession' | 'updateInterval'>): (
  sessionId: string
) => void {
  let lastSessionId: string | undefined;
  let nextUpdate = 0;

  return (sessionId) => {
    const now = dateNow();
    if (sessionId === lastSessionId && now < nextUpdate && nextUpdate - now <= updateInterval) {
      return;
    }
    lastSessionId = sessionId;
    nextUpdate = now + updateInterval;
    const session = fetchUserSession();
    // Accepted old batches must not refresh a replacement session or resurrect
    // an expired one. This path records activity only; it never rotates.
    if (session?.sessionId !== sessionId || !isUserSessionValid(session)) {
      return;
    }
    storeUserSession({ ...session, lastActivity: now });
  };
}

export function addSessionMetadataToNextSession(
  newSession: FaroUserSession,
  previousSession: FaroUserSession | null
): Required<FaroUserSession> {
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

  return function syncSessionIfChangedExternally(meta: Meta): void {
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
