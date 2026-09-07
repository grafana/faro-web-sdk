import { faro, stringifyExternalJson } from '@grafana/faro-core';
import type { MetaSession } from '@grafana/faro-core';

import { getItem, removeItem, setItem, webStorageType } from '../../../utils/webStorage';

import { STORAGE_KEY, STORAGE_UPDATE_DELAY } from './sessionConstants';
import {
  getSessionMetaUpdateHandler,
  getUserSessionActivityRecorder,
  getUserSessionUpdater,
} from './sessionManagerUtils';
import type { FaroUserSession } from './types';

export class PersistentSessionsManager {
  private static storageTypeLocal = webStorageType.local;
  private updateUserSession: ReturnType<typeof getUserSessionUpdater>;
  private recordUserSessionActivity: (sessionId: string) => void;

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

  constructor() {
    this.updateUserSession = getUserSessionUpdater({
      fetchUserSession: PersistentSessionsManager.fetchUserSession,
      storeUserSession: PersistentSessionsManager.storeUserSession,
      adoptSession: this.adoptSession,
      updateInterval: STORAGE_UPDATE_DELAY,
    });
    this.recordUserSessionActivity = getUserSessionActivityRecorder({
      fetchUserSession: PersistentSessionsManager.fetchUserSession,
      storeUserSession: PersistentSessionsManager.storeUserSession,
      updateInterval: STORAGE_UPDATE_DELAY,
    });

    this.init();
  }

  static removeUserSession(): void {
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

  updateSession = (): void => this.updateUserSession({ refreshActivity: false });

  recordActivity = (sessionId: string): void => this.recordUserSessionActivity(sessionId);

  private init(): void {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.updateSession();
        const sessionId = faro.api?.getSession()?.id;
        if (sessionId) {
          this.recordActivity(sessionId);
        }
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
