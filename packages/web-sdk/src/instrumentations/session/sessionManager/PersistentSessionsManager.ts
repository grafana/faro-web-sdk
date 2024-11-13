import { faro } from '@grafana/faro-core';
import type { Meta } from '@grafana/faro-core';

import { stringifyExternalJson, throttle } from '../../../utils';
import { getItem, removeItem, setItem, webStorageType } from '../../../utils/webStorage';

import { isSampled } from './sampling';
import { STORAGE_KEY, STORAGE_UPDATE_DELAY } from './sessionConstants';
import { addSessionMetadataToNextSession, createUserSessionObject, getUserSessionUpdater } from './sessionManagerUtils';
import type { FaroUserSession } from './types';

export class PersistentSessionsManager {
  private static storageTypeLocal = webStorageType.local;
  private updateUserSession: ReturnType<typeof getUserSessionUpdater>;

  constructor() {
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
    setItem(STORAGE_KEY, stringifyExternalJson(session), PersistentSessionsManager.storageTypeLocal);
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
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.updateSession();
      }
    });

    // Users can call the setSession() method, so we need to sync this with the local storage session
    faro.metas.addListener(function syncSessionIfChangedExternally(meta: Meta) {
      const session = meta.session;
      const sessionFromLocalStorage = PersistentSessionsManager.fetchUserSession();

      if (session && session.id !== sessionFromLocalStorage?.sessionId) {
        const userSession = addSessionMetadataToNextSession(
          createUserSessionObject({ sessionId: session.id, isSampled: isSampled() }),
          sessionFromLocalStorage
        );

        PersistentSessionsManager.storeUserSession(userSession);
        faro.api.setSession(userSession.sessionMeta);
      }
    });
  }
}
