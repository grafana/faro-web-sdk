import { faro, stringifyExternalJson } from '@grafana/faro-core';
import type { MetaSession } from '@grafana/faro-core';

import { throttle } from '../../../utils';
import { getItem, removeItem, setItem, webStorageType } from '../../../utils/webStorage';

import { getSessionStorageKey } from './getSessionStorageKey';
import { STORAGE_UPDATE_DELAY } from './sessionConstants';
import { getSessionMetaUpdateHandler, getUserSessionUpdater } from './sessionManagerUtils';
import type { FaroUserSession } from './types';

export class PersistentSessionsManager {
  private static storageTypeLocal = webStorageType.local;
  private readonly storageKey: string;
  private updateUserSession: ReturnType<typeof getUserSessionUpdater>;

  // Set only for the synchronous span of an adopting setSession(); the session
  // instrumentation reads isAdopting() to suppress its lifecycle event.
  private adopting = false;

  isAdopting = (): boolean => this.adopting;

  private adoptSession = (sessionMeta: MetaSession): void => {
    this.adopting = true;
    try {
      faro.api?.setSession(sessionMeta);
    } finally {
      this.adopting = false;
    }
  };

  constructor(namespace?: string) {
    this.storageKey = getSessionStorageKey(namespace);
    this.updateUserSession = getUserSessionUpdater({
      fetchUserSession: this.fetchUserSession,
      storeUserSession: this.storeUserSession,
      adoptSession: this.adoptSession,
    });

    this.init();
  }

  removeUserSession = (): void => {
    removeItem(this.storageKey, PersistentSessionsManager.storageTypeLocal);
  };

  storeUserSession = (session: FaroUserSession): void => {
    setItem(this.storageKey, stringifyExternalJson(session), PersistentSessionsManager.storageTypeLocal);
  };

  fetchUserSession = (): FaroUserSession | null => {
    const storedSession = getItem(this.storageKey, PersistentSessionsManager.storageTypeLocal);

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
