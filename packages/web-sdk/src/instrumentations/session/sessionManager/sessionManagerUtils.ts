import {
  dateNow,
  deepEqual,
  EVENT_OVERRIDES_SERVICE_NAME,
  faro,
  genShortID,
  isEmpty,
  stringifyExternalJson,
} from '@grafana/faro-core';
import type { Meta, MetaOverrides, MetaSession } from '@grafana/faro-core';

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
  isActive?: () => boolean;
};

type UpdateSessionParams = { forceSessionExtend?: boolean; refreshActivity?: boolean; expectedSessionId?: string };

export function getUserSessionUpdater({
  fetchUserSession,
  storeUserSession,
  adoptSession,
  updateInterval = 0,
  isActive = () => true,
}: GetUserSessionUpdaterParams): (options?: UpdateSessionParams) => void {
  let nextUpdate = 0;
  return function updateSession({
    forceSessionExtend = false,
    refreshActivity = true,
    expectedSessionId,
  }: UpdateSessionParams = {}): void {
    if (!isActive()) {
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
    if (!isActive()) {
      return;
    }
    if (
      expectedSessionId != null &&
      (sessionFromStorage?.sessionId !== expectedSessionId || faro.metas.value.session?.id !== expectedSessionId)
    ) {
      return;
    }
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
        isActive() &&
        adoptSession != null &&
        sessionFromStorage!.sessionMeta != null &&
        sessionFromStorage!.sessionId !== inMemorySessionId
      ) {
        adoptSession(sessionFromStorage!.sessionMeta);
      }
    } else {
      const endPreparation = faro.metas.beginSessionUpdate?.();
      try {
        const sampled = isSampled();
        if (!isActive()) {
          return;
        }
        // Materialize getters and toJSON while still preparing. The final
        // ownership check must precede a write of callback-free session data.
        const newSession = JSON.parse(
          stringifyExternalJson(
            addSessionMetadataToNextSession(createUserSessionObject({ isSampled: sampled }), sessionFromStorage)
          )
        ) as Required<FaroUserSession>;
        if (!isActive()) {
          return;
        }
        // Recheck at the mutation point after sampler/generator/metadata
        // callbacks. Storage is still best-effort across independent tabs.
        if (expectedSessionId != null) {
          if (
            faro.metas.value.session?.id !== expectedSessionId ||
            fetchUserSession()?.sessionId !== expectedSessionId ||
            !isActive()
          ) {
            return;
          }
        }
        storeUserSession(newSession);
        if (!isActive()) {
          return;
        }
        nextUpdate = now + updateInterval;
        faro.api?.setSession(newSession.sessionMeta);
        const currentSessionId = faro.metas.value.session?.id;
        if (isActive() && currentSessionId === newSession.sessionId) {
          sessionTrackingConfig?.onSessionChange?.(sessionFromStorage?.sessionMeta ?? null, newSession.sessionMeta!);
        }
      } catch (error) {
        nextUpdate = 0;
        throw error;
      } finally {
        endPreparation?.();
      }
    }
  };
}

export function getUserSessionActivityRecorder({
  fetchUserSession,
  storeUserSession,
  updateInterval = 0,
  isActive = () => true,
}: Pick<GetUserSessionUpdaterParams, 'fetchUserSession' | 'storeUserSession' | 'updateInterval' | 'isActive'>): (
  sessionId: string
) => void {
  let lastSessionId: string | undefined;
  let nextUpdate = 0;

  return (sessionId) => {
    if (!isActive()) {
      return;
    }
    const now = dateNow();
    if (sessionId === lastSessionId && now < nextUpdate && nextUpdate - now <= updateInterval) {
      return;
    }
    lastSessionId = sessionId;
    nextUpdate = now + updateInterval;
    const session = fetchUserSession();
    // Accepted old batches must not refresh a replacement session or resurrect
    // an expired one. This path records activity only; it never rotates.
    if (!isActive() || session?.sessionId !== sessionId || !isUserSessionValid(session)) {
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
  isActive?: () => boolean;
};

export function getSessionMetaUpdateHandler({
  fetchUserSession,
  storeUserSession,
  isActive = () => true,
}: GetUserSessionMetaUpdateHandlerParams) {
  let synchronizing: 'preparing' | MetaSession | undefined;
  let pendingNotification = false;

  return function syncSessionIfChangedExternally(meta: Meta): void {
    if (!isActive()) {
      return;
    }
    if (synchronizing === 'preparing') {
      pendingNotification = true;
      return;
    }
    if (synchronizing && deepEqual(meta.session, synchronizing)) {
      return;
    }
    const session = meta.session;
    const sessionFromSessionStorage = fetchUserSession();
    if (!isActive()) {
      return;
    }

    let sessionId = session?.id;
    const sessionAttributes = session?.attributes;
    const sessionOverrides = session?.overrides;

    const storedSessionMeta = sessionFromSessionStorage?.sessionMeta;
    const storedSessionMetaOverrides = storedSessionMeta?.overrides;

    const hasSessionOverridesChanged = !!sessionOverrides && !deepEqual(sessionOverrides, storedSessionMetaOverrides);
    const hasAttributesChanged = !!sessionAttributes && !deepEqual(sessionAttributes, storedSessionMeta?.attributes);
    const hasSessionIdChanged = !!session && sessionId !== sessionFromSessionStorage?.sessionId;

    if (hasSessionIdChanged || hasAttributesChanged || hasSessionOverridesChanged) {
      const previousMetaSession = session;
      const previousSynchronization = synchronizing;
      synchronizing = 'preparing';
      pendingNotification = false;
      const endPreparation = faro.metas.beginSessionUpdate?.();
      let rescan = false;
      try {
        const sampled = isSampled();
        if (!isActive()) {
          return;
        }
        const userSession = JSON.parse(
          stringifyExternalJson(
            addSessionMetadataToNextSession(
              createUserSessionObject({ sessionId, isSampled: sampled }),
              sessionFromSessionStorage
            )
          )
        ) as Required<FaroUserSession>;
        const currentMetaSession = faro.metas.value.session;
        if (!isActive()) {
          return;
        }
        // Identical nested setters can share this normalization. A notification
        // during comparison instead belongs to a newer operation.
        rescan = pendingNotification;
        pendingNotification = false;
        if (deepEqual(currentMetaSession, previousMetaSession) && !pendingNotification && isActive()) {
          rescan = false;
          storeUserSession(userSession);
          if (!isActive()) {
            return;
          }
          // Suppress our completed replacement even when persistence failed.
          synchronizing = userSession.sessionMeta;
          faro.api.setSession(userSession.sessionMeta);
          const currentSessionId = faro.metas.value.session?.id;
          if (isActive() && currentSessionId === userSession.sessionId) {
            sendOverrideEvent(
              hasSessionOverridesChanged,
              userSession.sessionMeta.overrides,
              storedSessionMetaOverrides
            );
          }
        }
      } finally {
        endPreparation?.();
        synchronizing = previousSynchronization;
        rescan ||= pendingNotification;
        pendingNotification = false;
      }
      if (rescan && isActive()) {
        faro.metas.assertCaptureAllowed?.();
        syncSessionIfChangedExternally(faro.metas.value);
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
