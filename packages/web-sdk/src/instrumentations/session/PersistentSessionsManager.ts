import { faro } from '@grafana/faro-core';
import type { Meta } from '@grafana/faro-core';

import { throttle } from '../../utils';
import { getItem, removeItem, setItem, webStorageType } from '../../utils/webStorage';

import type { FaroUserSession } from './types';
import { createUserSessionObject, getUserSessionUpdater, STORAGE_KEY, STORAGE_UPDATE_DELAY } from './utils';

export class PersistentSessionsManager {
  private static storageTypeLocal = webStorageType.local;
  private updateUserSession: ReturnType<typeof getUserSessionUpdater>;

  constructor(private initialSessionId?: string) {
    this.updateUserSession = getUserSessionUpdater({
      fetchUserSession: PersistentSessionsManager.fetchUserSession,
      storeUserSession: PersistentSessionsManager.storeUserSession,
      faro,
    });

    this.init();
  }

  static removeUserSession() {
    removeItem(STORAGE_KEY, PersistentSessionsManager.storageTypeLocal);
  }

  static storeUserSession(session: FaroUserSession): void {
    setItem(STORAGE_KEY, JSON.stringify(session), PersistentSessionsManager.storageTypeLocal);
  }

  static fetchUserSession(): FaroUserSession | null {
    const storedSession = getItem(STORAGE_KEY, PersistentSessionsManager.storageTypeLocal);

    if (storedSession) {
      return JSON.parse(storedSession) as FaroUserSession;
    }

    return null;
  }

  updateSession = throttle(() => this.updateUserSession(), STORAGE_UPDATE_DELAY);

  private init(): void {
    PersistentSessionsManager.storeUserSession(createUserSessionObject(this.initialSessionId));

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.updateSession();
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
      const sessionFromLocalStorage = PersistentSessionsManager.fetchUserSession();

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

        PersistentSessionsManager.storeUserSession(userSession);
        faro.api.setSession(userSession.sessionMeta);
      }
    });
  }
}
