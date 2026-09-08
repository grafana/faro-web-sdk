import { dateNow, deepEqual, EVENT_OVERRIDES_SERVICE_NAME, faro, genShortID, isEmpty } from '@grafana/faro-core';
import type { Config, Meta, MetaOverrides, MetaSession } from '@grafana/faro-core';

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

export type UserSessionUpdaterContext = {
  getInMemorySessionId?: () => string | undefined;
  getSessionTrackingConfig?: () => Config['sessionTracking'];
  getSessionAttributes?: () => Record<string, string> | undefined;
  getSessionOverrides?: () => MetaOverrides | undefined;
  setSession?: (session: MetaSession) => void;
  onSessionChange?: NonNullable<Config['sessionTracking']>['onSessionChange'];
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
  context?: UserSessionUpdaterContext;
};

type UpdateSessionParams = {
  forceSessionExtend?: boolean;
  invalidatedSessionId?: string;
};

export function getUserSessionUpdater({
  fetchUserSession,
  storeUserSession,
  adoptSession,
  context,
}: GetUserSessionUpdaterParams): (options?: UpdateSessionParams) => void {
  let isForceExtending = false;

  const getSessionTrackingConfig = () => {
    if (context?.getSessionTrackingConfig) {
      return context.getSessionTrackingConfig();
    }

    return faro.config.sessionTracking;
  };
  const getInMemorySessionId = () => {
    if (context?.getInMemorySessionId) {
      return context.getInMemorySessionId();
    }

    return faro.metas.value.session?.id;
  };
  const setSession = (sessionMeta: MetaSession) => {
    if (context?.setSession) {
      context.setSession(sessionMeta);
      return;
    }

    faro.api?.setSession(sessionMeta);
  };

  return function updateSession({ forceSessionExtend = false, invalidatedSessionId }: UpdateSessionParams = {}): void {
    if (!fetchUserSession || !storeUserSession) {
      return;
    }

    const sessionTrackingConfig = getSessionTrackingConfig();
    const isPersistentSessions = sessionTrackingConfig?.persistent;

    if ((isPersistentSessions && !isLocalStorageAvailable) || (!isPersistentSessions && !isSessionStorageAvailable)) {
      return;
    }

    if (forceSessionExtend) {
      const currentSessionId = getInMemorySessionId();

      if (invalidatedSessionId != null) {
        if (currentSessionId !== invalidatedSessionId) {
          return;
        }
      } else if (currentSessionId != null) {
        // The batch carried no session id, but a concurrent invalidation already rotated.
        return;
      }

      if (isForceExtending) {
        return;
      }

      isForceExtending = true;
    }

    try {
      const sessionFromStorage = fetchUserSession();

      if (forceSessionExtend === false && isUserSessionValid(sessionFromStorage)) {
        storeUserSession({ ...sessionFromStorage!, lastActivity: dateNow() });

        // Another tab rotated the shared session; adopt it so we stop emitting the stale id.
        const inMemorySessionId = getInMemorySessionId();
        if (
          adoptSession != null &&
          sessionFromStorage!.sessionMeta != null &&
          sessionFromStorage!.sessionId !== inMemorySessionId
        ) {
          adoptSession(sessionFromStorage!.sessionMeta);
        }
      } else {
        const newSession = addSessionMetadataToNextSession(
          createUserSessionObject({ isSampled: isSampled() }),
          sessionFromStorage,
          context
        );

        storeUserSession(newSession);

        setSession(newSession.sessionMeta);
        const onSessionChange = context?.onSessionChange ?? sessionTrackingConfig?.onSessionChange;
        onSessionChange?.(sessionFromStorage?.sessionMeta ?? null, newSession.sessionMeta!);
      }
    } finally {
      if (forceSessionExtend) {
        isForceExtending = false;
      }
    }
  };
}

export function addSessionMetadataToNextSession(
  newSession: FaroUserSession,
  previousSession: FaroUserSession | null,
  context?: UserSessionUpdaterContext
): Required<FaroUserSession> {
  const sessionTrackingConfig = context?.getSessionTrackingConfig?.() ?? faro.config?.sessionTracking;

  const sessionWithMeta: Required<FaroUserSession> = {
    ...newSession,
    sessionMeta: {
      id: newSession.sessionId,
      attributes: removeUndefinedValues({
        ...sessionTrackingConfig?.session?.attributes,
        ...(context?.getSessionAttributes?.() ?? faro.metas?.value?.session?.attributes ?? {}),
        isSampled: newSession.isSampled.toString(),
      }),
    },
  };

  const overrides =
    context?.getSessionOverrides?.() ??
    faro.metas?.value?.session?.overrides ??
    previousSession?.sessionMeta?.overrides;
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
