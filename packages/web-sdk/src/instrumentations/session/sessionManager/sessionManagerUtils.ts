import { dateNow, deepEqual, EVENT_OVERRIDES_SERVICE_NAME, faro, genShortID, isEmpty } from '@grafana/faro-core';
import type { Config, Meta, MetaOverrides, Metas, MetaSession } from '@grafana/faro-core';

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

export type UserSessionUpdaterContext = {
  getInMemorySessionId?: () => string | undefined;
  getSessionTrackingConfig?: () => Config['sessionTracking'];
  getSessionAttributes?: () => Record<string, string> | undefined;
  getSessionOverrides?: () => MetaOverrides | undefined;
  getMetas?: () => Meta;
  metas?: Metas;
  setSession?: (session: MetaSession) => void;
  onSessionChange?: NonNullable<Config['sessionTracking']>['onSessionChange'];
};

export function createUserSessionObject({
  sessionId,
  started,
  lastActivity,
  isSampled = true,
  generateSessionId,
}: CreateUserSessionObjectParams = {}): FaroUserSession {
  const now = dateNow();

  const resolvedGenerateSessionId = generateSessionId ?? faro.config?.sessionTracking?.generateSessionId;

  if (sessionId == null) {
    sessionId = typeof resolvedGenerateSessionId === 'function' ? resolvedGenerateSessionId() : genShortID();
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
  context?: UserSessionUpdaterContext;
};

type UpdateSessionParams = {
  forceSessionExtend?: boolean;
  refreshActivity?: boolean;
  invalidatedSessionId?: string;
};

export function getUserSessionUpdater({
  fetchUserSession,
  storeUserSession,
  adoptSession,
  updateInterval = 0,
  context,
}: GetUserSessionUpdaterParams): (options?: UpdateSessionParams) => void {
  let nextUpdate = 0;
  let isForceExtending = false;

  const getSessionTrackingConfig = () => context?.getSessionTrackingConfig?.() ?? faro.config.sessionTracking;
  const getInMemorySessionId = () => context?.getInMemorySessionId?.() ?? faro.metas.value.session?.id;
  const setSession = (sessionMeta: MetaSession) => {
    if (context?.setSession) {
      context.setSession(sessionMeta);
      return;
    }

    faro.api?.setSession(sessionMeta);
  };

  return function updateSession({
    forceSessionExtend = false,
    refreshActivity = true,
    invalidatedSessionId,
  }: UpdateSessionParams = {}): void {
    if (!fetchUserSession || !storeUserSession) {
      return;
    }

    const now = dateNow();
    if (!forceSessionExtend && now < nextUpdate && nextUpdate - now <= updateInterval) {
      return;
    }

    const sessionTrackingConfig = getSessionTrackingConfig();
    const isPersistentSessions = sessionTrackingConfig?.persistent;

    if ((isPersistentSessions && !isLocalStorageAvailable) || (!isPersistentSessions && !isSessionStorageAvailable)) {
      return;
    }

    const sessionFromStorage = fetchUserSession();

    if (forceSessionExtend) {
      const currentSessionId = getInMemorySessionId();
      const storedSessionId = sessionFromStorage?.sessionId;

      if (invalidatedSessionId != null) {
        if (currentSessionId !== invalidatedSessionId || storedSessionId !== invalidatedSessionId) {
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
          createUserSessionObject({
            isSampled: isSampled({
              sessionTracking: sessionTrackingConfig,
              metas: context?.getMetas?.() ?? faro.metas.value,
            }),
            generateSessionId: sessionTrackingConfig?.generateSessionId,
          }),
          sessionFromStorage,
          context
        );
        nextUpdate = now + updateInterval;

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

type GetSessionMetaUpdateHandlerParams = {
  storeUserSession: (session: FaroUserSession) => void;
  fetchUserSession: () => FaroUserSession | null;
  context?: UserSessionUpdaterContext;
};

export function getSessionMetaUpdateHandler({
  fetchUserSession,
  storeUserSession,
  context,
}: GetSessionMetaUpdateHandlerParams) {
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
      const sessionTrackingConfig = context?.getSessionTrackingConfig?.() ?? faro.config?.sessionTracking;
      const userSession = addSessionMetadataToNextSession(
        createUserSessionObject({
          sessionId,
          isSampled: isSampled({
            sessionTracking: sessionTrackingConfig,
            metas: context?.getMetas?.() ?? faro.metas.value,
          }),
          generateSessionId: sessionTrackingConfig?.generateSessionId,
        }),
        sessionFromSessionStorage,
        context
      );

      storeUserSession(userSession);
      sendOverrideEvent(hasSessionOverridesChanged, sessionOverrides, storedSessionMetaOverrides, context);

      isSyncing = true;
      try {
        if (context?.setSession) {
          context.setSession(userSession.sessionMeta);
        } else {
          faro.api.setSession(userSession.sessionMeta);
        }
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
  context?: UserSessionUpdaterContext
) {
  if (!hasSessionOverridesChanged) {
    return;
  }

  const serviceName = sessionOverrides.serviceName;
  const previousServiceName =
    storedSessionOverrides.serviceName ?? context?.getMetas?.()?.app?.name ?? faro.metas.value.app?.name ?? '';

  if (serviceName && serviceName !== previousServiceName) {
    faro.api.pushEvent(EVENT_OVERRIDES_SERVICE_NAME, {
      serviceName,
      previousServiceName,
    });
  }
}
