import { faro } from '@grafana/faro-core';
import type { Meta } from '@grafana/faro-core';

import { throttle } from '../../../utils';
import { getItem, removeItem, setItem, webStorageType } from '../../../utils/webStorage';

import { isSampled } from './sampling';
import { STORAGE_KEY, STORAGE_UPDATE_DELAY } from './sessionConstants';
import { addSessionMetadataToNextSession, createUserSessionObject, getUserSessionUpdater } from './sessionManagerUtils';
import type { FaroUserSession } from './types';

export class PersistentSessionsManager {
  private static storageTypeLocal = webStorageType.local;
  private updateUserSession: ReturnType<typeof getUserSessionUpdater>;

  constructor(private initialSessionId?: string) {
    this.updateUserSession = getUserSessionUpdater({
      fetchUserSession: PersistentSessionsManager.fetchUserSession,
      storeUserSession: PersistentSessionsManager.storeUserSession,
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
    const initialUserSession = createUserSessionObject(this.initialSessionId, isSampled());
    PersistentSessionsManager.storeUserSession(initialUserSession);
    faro.api.setSession({
      ...faro.api.getSession(),
      attributes: {
        ...(faro.api.getSession()?.attributes ?? {}),
        isSampled: initialUserSession.isSampled.toString(),
      },
    });

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
        const userSession = addSessionMetadataToNextSession(
          createUserSessionObject(session.id, isSampled()),
          sessionFromLocalStorage
        );

        PersistentSessionsManager.storeUserSession(userSession);
        faro.api.setSession(userSession.sessionMeta);
      }
    });
  }
}
