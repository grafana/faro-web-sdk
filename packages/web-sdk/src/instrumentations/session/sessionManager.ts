import { dateNow, faro, genShortID, Meta, MetaSession } from '@grafana/faro-core';

import { throttle } from '../../utils';
import { getItem, isLocalStorageAvailable, removeItem, setItem } from '../../utils/webStorage';

export interface FaroUserSession {
  sessionId: string;
  lastActivity: number;
  started: number;
  sessionMeta?: MetaSession;
}

// TODO: make this configurable from the outside
export const SESSION_EXPIRATION_TIME = 4 * 60 * 60 * 1000; // n hrs
export const SESSION_INACTIVITY_TIME = 15 * 60 * 1000; // n minutes
const STORAGE_UPDATE_DELAY = 1 * 1000; // n seconds

export const STORAGE_KEY = '__FARO_SESSION__';

export function createUserSessionObject(sessionId?: string): FaroUserSession {
  const now = dateNow();

  return {
    sessionId: sessionId ?? genShortID(),
    lastActivity: now,
    started: now,
  };
}

export function removeUserSession() {
  removeItem(STORAGE_KEY);
}

export function storeUserSession(session: FaroUserSession): void {
  setItem(STORAGE_KEY, JSON.stringify(session));
}

export function receiveUserSession(): FaroUserSession | null {
  const storedSession = getItem(STORAGE_KEY);

  if (storedSession) {
    return JSON.parse(storedSession) as FaroUserSession;
  }

  return null;
}

export function isUserSessionValid(session: FaroUserSession | null): boolean {
  if (session == null) {
    return false;
  }

  const now = dateNow();
  const lifetimeValid = now - session.started < SESSION_EXPIRATION_TIME;
  const inactivityPeriodValid = now - session.lastActivity < SESSION_INACTIVITY_TIME;

  return lifetimeValid && inactivityPeriodValid;
}

interface PersistentUserSessionManager {
  onActivity: () => void;
}

export function persistentUserSessionsManager(initialSessionId?: string): PersistentUserSessionManager {
  const throttledSessionUpdate = throttle(() => {
    const sessionFromLocalStorage = receiveUserSession();

    if (isUserSessionValid(sessionFromLocalStorage)) {
      storeUserSession({ ...sessionFromLocalStorage!, lastActivity: dateNow() });
    } else {
      let newSession = createUserSessionObject(); // create local srorage session
      newSession = {
        ...newSession,
        sessionMeta: {
          id: newSession.sessionId,
          attributes: {
            ...(faro.metas.value.session?.attributes ?? {}),
            ...(sessionFromLocalStorage != null ? { previousSession: sessionFromLocalStorage.sessionId } : {}),
          },
        },
      };

      storeUserSession(newSession);

      faro.api?.setSession(newSession.sessionMeta);
      faro.config.experimental_sessions?.onSessionSwitch?.(
        sessionFromLocalStorage?.sessionMeta ?? null,
        newSession.sessionMeta!
      );
    }
  }, STORAGE_UPDATE_DELAY);

  (function init() {
    storeUserSession(createUserSessionObject(initialSessionId));

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        throttledSessionUpdate();
      }
    });

    window.addEventListener('storage', (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) {
        return;
      }

      const newSession: FaroUserSession = JSON.parse(event.newValue ?? '');
      const previousSession: FaroUserSession = JSON.parse(event.oldValue ?? '');

      if (newSession.sessionId !== previousSession.sessionId) {
        faro.api?.setSession(newSession.sessionMeta);
      }
    });

    // Users can call the setSession() method, so we need to sync this with the local storage session
    faro.metas.addListener(function syncSessionIfChangedExternally(meta: Meta) {
      const session = meta.session;
      const sessionFromLocalStorage = receiveUserSession();

      if (session && session.id !== sessionFromLocalStorage?.sessionId) {
        const userSession = {
          ...createUserSessionObject(session.id),
          sessionMeta: {
            id: session.id,
            attributes: {
              ...(sessionFromLocalStorage?.sessionMeta?.attributes ?? {}),
              ...session.attributes,
              ...(sessionFromLocalStorage ? { previousSession: sessionFromLocalStorage.sessionId } : {}),
            },
          },
        };

        storeUserSession(userSession);
        faro.api.setSession(userSession.sessionMeta);
      }
    });
  })();

  return {
    onActivity: throttledSessionUpdate,
  };
}

interface InMemoryUserSessionsManager {
  onActivity: () => void;
}

export function inMemoryUserSessionsManager(initialSessionId?: string): InMemoryUserSessionsManager {
  let inMemoryUserSession: FaroUserSession = createUserSessionObject(initialSessionId);

  function onActivity() {
    if (isUserSessionValid(inMemoryUserSession)) {
      inMemoryUserSession.lastActivity = dateNow();
    } else {
      inMemoryUserSession = createUserSessionObject();

      const previousSessionMeta = faro.metas.value.session;
      const newSessionMeta = {
        id: inMemoryUserSession.sessionId,
        attributes: {
          ...(faro.metas.value.session?.attributes ?? {}),
          ...(previousSessionMeta?.id ? { previousSession: previousSessionMeta.id } : {}),
        },
      };

      faro.config.experimental_sessions?.onSessionSwitch?.(previousSessionMeta ?? null, newSessionMeta);

      faro.api?.setSession(newSessionMeta);
    }
  }

  (function init() {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        onActivity();
      }
    });

    // Users can call the setSession() method, so we need to sync this with the inMemoryUserSession
    faro.metas.addListener(function syncSessionIfChangedExternally(meta: Meta) {
      const session = meta.session;

      if (session && session.id !== inMemoryUserSession?.sessionId) {
        const previousSessionId = inMemoryUserSession.sessionId;
        inMemoryUserSession = createUserSessionObject(session.id);

        faro.api.setSession({
          id: inMemoryUserSession.sessionId,
          attributes: {
            ...(session.attributes ?? {}),
            previousSession: previousSessionId,
          },
        });
      }
    });
  })();

  return {
    onActivity,
  };
}

export type SessionManager = PersistentUserSessionManager | InMemoryUserSessionsManager;
export function getSessionManager(initialSessionId?: string): SessionManager {
  if (faro.config.experimental_sessions?.persistent && isLocalStorageAvailable) {
    return persistentUserSessionsManager(initialSessionId);
  }

  return inMemoryUserSessionsManager(initialSessionId);
}
