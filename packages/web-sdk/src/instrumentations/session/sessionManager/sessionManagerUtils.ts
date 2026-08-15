import { dateNow, deepEqual, EVENT_OVERRIDES_SERVICE_NAME, faro, genShortID, isEmpty } from '@grafana/faro-core';
import type { API, Config, Meta, MetaOverrides, Metas } from '@grafana/faro-core';

import { isLocalStorageAvailable, isSessionStorageAvailable } from '../../../utils';

import { isSampled } from './sampling';
import { SESSION_EXPIRATION_TIME, SESSION_INACTIVITY_TIME } from './sessionConstants';
import type { FaroUserSession } from './types';

type CreateUserSessionObjectParams = {
  sessionId?: string;
  started?: number;
  lastActivity?: number;
  isSampled?: boolean;
  generateSessionId?: () => string;
};

export function createUserSessionObject({
  sessionId,
  started,
  lastActivity,
  isSampled = true,
  generateSessionId: generateSessionIdParam,
}: CreateUserSessionObjectParams = {}): FaroUserSession {
  const now = dateNow();

  const generateSessionId = generateSessionIdParam ?? faro.config?.sessionTracking?.generateSessionId;

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
  config: Config;
  metas: Metas;
  api: API;
};

type UpdateSessionParams = { forceSessionExtend: boolean };

export function getUserSessionUpdater({
  fetchUserSession,
  storeUserSession,
  adoptSession,
  config,
  metas,
  api,
}: GetUserSessionUpdaterParams): (options?: UpdateSessionParams) => void {
  return function updateSession({ forceSessionExtend } = { forceSessionExtend: false }): void {
    if (!fetchUserSession || !storeUserSession) {
      return;
    }

    const sessionTrackingConfig = config.sessionTracking;
    const isPersistentSessions = sessionTrackingConfig?.persistent;

    if ((isPersistentSessions && !isLocalStorageAvailable) || (!isPersistentSessions && !isSessionStorageAvailable)) {
      return;
    }

    const sessionFromStorage = fetchUserSession();

    if (forceSessionExtend === false && isUserSessionValid(sessionFromStorage)) {
      storeUserSession({ ...sessionFromStorage!, lastActivity: dateNow() });

      // Another tab rotated the shared session; adopt it so we stop emitting the stale id.
      const inMemorySessionId = metas.value.session?.id;
      if (
        adoptSession != null &&
        sessionFromStorage!.sessionMeta != null &&
        sessionFromStorage!.sessionId !== inMemorySessionId
      ) {
        adoptSession(sessionFromStorage!.sessionMeta);
      }
    } else {
      let newSession = addSessionMetadataToNextSession(
        createUserSessionObject({
          isSampled: isSampled({ config, metas }),
          generateSessionId: config.sessionTracking?.generateSessionId,
        }),
        sessionFromStorage,
        config,
        metas
      );

      storeUserSession(newSession);

      api?.setSession(newSession.sessionMeta);
      sessionTrackingConfig?.onSessionChange?.(sessionFromStorage?.sessionMeta ?? null, newSession.sessionMeta!);
    }
  };
}

export function addSessionMetadataToNextSession(
  newSession: FaroUserSession,
  previousSession: FaroUserSession | null,
  config?: Config,
  metas?: Metas
) {
  const resolvedConfig = config ?? faro.config;
  const resolvedMetas = metas ?? faro.metas;

  const sessionWithMeta: Required<FaroUserSession> = {
    ...newSession,
    sessionMeta: {
      id: newSession.sessionId,
      attributes: removeUndefinedValues({
        ...resolvedConfig.sessionTracking?.session?.attributes,
        ...(resolvedMetas.value.session?.attributes ?? {}),
        isSampled: newSession.isSampled.toString(),
      }),
    },
  };

  const overrides = resolvedMetas.value.session?.overrides ?? previousSession?.sessionMeta?.overrides;
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
  config: Config;
  metas: Metas;
  api: API;
};

export function getSessionMetaUpdateHandler({
  fetchUserSession,
  storeUserSession,
  config,
  metas,
  api,
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
        createUserSessionObject({
          sessionId,
          isSampled: isSampled({ config, metas }),
          generateSessionId: config.sessionTracking?.generateSessionId,
        }),
        sessionFromSessionStorage,
        config,
        metas
      );

      storeUserSession(userSession);
      sendOverrideEvent(hasSessionOverridesChanged, sessionOverrides, storedSessionMetaOverrides, metas, api);

      isSyncing = true;
      try {
        api.setSession(userSession.sessionMeta);
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
  storedSessionOverrides: MetaOverrides = {},
  metas: Metas,
  api: API
) {
  if (!hasSessionOverridesChanged) {
    return;
  }

  const serviceName = sessionOverrides.serviceName;
  const previousServiceName = storedSessionOverrides.serviceName ?? metas.value.app?.name ?? '';

  if (serviceName && serviceName !== previousServiceName) {
    api.pushEvent(EVENT_OVERRIDES_SERVICE_NAME, {
      serviceName,
      previousServiceName,
    });
  }
}
