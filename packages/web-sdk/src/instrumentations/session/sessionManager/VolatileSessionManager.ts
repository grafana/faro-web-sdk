import { faro, stringifyExternalJson } from '@grafana/faro-core';

import { throttle } from '../../../utils';
import { getItem, removeItem, setItem, webStorageType } from '../../../utils/webStorage';

import { getSessionStorageKey } from './getSessionStorageKey';
import { STORAGE_UPDATE_DELAY } from './sessionConstants';
import { getSessionMetaUpdateHandler, getUserSessionUpdater } from './sessionManagerUtils';
import type { FaroUserSession } from './types';

export class VolatileSessionsManager {
  private static storageTypeSession = webStorageType.session;
  private readonly storageKey: string;
  private updateUserSession: ReturnType<typeof getUserSessionUpdater>;

  // sessionStorage is tab-local, so this manager never adopts another tab's
  // session. Stubbed so the instrumentation can treat both managers uniformly.
  isAdopting = (): boolean => false;

  constructor(namespace: string | undefined) {
    this.storageKey = getSessionStorageKey(namespace);

    this.updateUserSession = getUserSessionUpdater({
      fetchUserSession: this.fetchUserSession,
      storeUserSession: this.storeUserSession,
    });

    this.init();
  }

  removeUserSession = (): void => {
    removeItem(this.storageKey, VolatileSessionsManager.storageTypeSession);
  };

  storeUserSession = (session: FaroUserSession): void => {
    setItem(this.storageKey, stringifyExternalJson(session), VolatileSessionsManager.storageTypeSession);
  };

  fetchUserSession = (): FaroUserSession | null => {
    const storedSession = getItem(this.storageKey, VolatileSessionsManager.storageTypeSession);

    if (storedSession) {
      return JSON.parse(storedSession) as FaroUserSession;
    }

    return null;
  };

  updateSession = throttle(() => this.updateUserSession(), STORAGE_UPDATE_DELAY);

  private init(): void {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.updateSession();
      }
    });

    // Users can call the setSession() method, so we need to sync this with the local storage session.
    // Guard: faro.metas is only available after initializeFaro(); construction before that is
    // supported for testing (e.g. getting method refs) but skips the meta listener.
    faro.metas?.addListener(
      getSessionMetaUpdateHandler({
        fetchUserSession: this.fetchUserSession,
        storeUserSession: this.storeUserSession,
      })
    );
  }
}
