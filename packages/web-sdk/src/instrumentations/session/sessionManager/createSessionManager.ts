import { faro, stringifyExternalJson } from '@grafana/faro-core';

import { throttle } from '../../../utils';
import { getItem, removeItem, setItem } from '../../../utils/webStorage';

import { STORAGE_KEY, STORAGE_UPDATE_DELAY } from './sessionConstants';
import { getSessionMetaUpdateHandler, getUserSessionUpdater } from './sessionManagerUtils';
import type { FaroUserSession } from './types';

type StorageType = 'sessionStorage' | 'localStorage';

/** @internal */
export function createSessionManagerClass(storageType: StorageType) {
  class SessionManager {
    /** @internal */ _updateUserSession: ReturnType<typeof getUserSessionUpdater>;

    constructor() {
      this._updateUserSession = getUserSessionUpdater({
        fetchUserSession: SessionManager.fetchUserSession,
        storeUserSession: SessionManager.storeUserSession,
      });

      this._init();
    }

    static removeUserSession() {
      removeItem(STORAGE_KEY, storageType);
    }

    static storeUserSession(session: FaroUserSession): void {
      setItem(STORAGE_KEY, stringifyExternalJson(session), storageType);
    }

    static fetchUserSession(): FaroUserSession | null {
      const storedSession = getItem(STORAGE_KEY, storageType);

      if (storedSession) {
        return JSON.parse(storedSession) as FaroUserSession;
      }

      return null;
    }

    updateSession = throttle(() => this._updateUserSession(), STORAGE_UPDATE_DELAY);

    /** @internal */ _init(): void {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.updateSession();
        }
      });

      faro.metas.addListener(
        getSessionMetaUpdateHandler({
          fetchUserSession: SessionManager.fetchUserSession,
          storeUserSession: SessionManager.storeUserSession,
        })
      );
    }
  }

  return SessionManager;
}
