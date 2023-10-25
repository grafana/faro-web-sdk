import { faro } from '@grafana/faro-core';
import type { Meta } from '@grafana/faro-core';

import { throttle } from '../../utils';
import { getItem, removeItem, setItem, webStorageType } from '../../utils/webStorage';

import type { FaroUserSession } from './types';
import { createUserSessionObject, getUserSessionUpdater, STORAGE_KEY, STORAGE_UPDATE_DELAY } from './utils';

export class VolatileSessionsManager {
  private static storageTypeSession = webStorageType.session;
  private updateUserSession: ReturnType<typeof getUserSessionUpdater>;

  constructor(private initialSessionId: string) {
    this.updateUserSession = getUserSessionUpdater({
      fetchUserSession: VolatileSessionsManager.fetchUserSession,
      storeUserSession: VolatileSessionsManager.storeUserSession,
      faro,
    });

    this.init();
  }

  static removeUserSession() {
    removeItem(STORAGE_KEY, VolatileSessionsManager.storageTypeSession);
  }

  static storeUserSession(session: FaroUserSession): void {
    setItem(STORAGE_KEY, JSON.stringify(session), VolatileSessionsManager.storageTypeSession);
  }

  static fetchUserSession(): FaroUserSession | null {
    const storedSession = getItem(STORAGE_KEY, VolatileSessionsManager.storageTypeSession);

    if (storedSession) {
      return JSON.parse(storedSession) as FaroUserSession;
    }

    return null;
  }

  updateSession = throttle(() => this.updateUserSession(), STORAGE_UPDATE_DELAY);

  private init(): void {
    VolatileSessionsManager.storeUserSession(createUserSessionObject(this.initialSessionId));

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.updateSession();
      }
    });

    // Users can call the setSession() method, so we need to sync this with the local storage session
    faro.metas.addListener(function syncSessionIfChangedExternally(meta: Meta) {
      const session = meta.session;
      const sessionFromSessionStorage = VolatileSessionsManager.fetchUserSession();

      if (session && session.id !== sessionFromSessionStorage?.sessionId) {
        const userSession = {
          ...createUserSessionObject(session.id),
          sessionMeta: {
            id: session.id,
            attributes: {
              ...(sessionFromSessionStorage?.sessionMeta?.attributes ?? {}),
              ...session.attributes,
              ...(sessionFromSessionStorage ? { previousSession: sessionFromSessionStorage.sessionId } : {}),
            },
          },
        };

        VolatileSessionsManager.storeUserSession(userSession);
        faro.api.setSession(userSession.sessionMeta);
      }
    });
  }
}
