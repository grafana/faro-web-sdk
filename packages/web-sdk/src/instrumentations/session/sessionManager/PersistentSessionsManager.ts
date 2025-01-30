import { faro, stringifyExternalJson } from '@grafana/faro-core';

import { throttle } from '../../../utils';
import { getItem, removeItem, setItem, webStorageType } from '../../../utils/webStorage';

import { STORAGE_KEY, STORAGE_UPDATE_DELAY } from './sessionConstants';
import { getSessionMetaUpdateHandler, getUserSessionUpdater } from './sessionManagerUtils';
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
    faro.metas.addListener(
      getSessionMetaUpdateHandler({
        fetchUserSession: PersistentSessionsManager.fetchUserSession,
        storeUserSession: PersistentSessionsManager.storeUserSession,
      })
    );
  }
}
