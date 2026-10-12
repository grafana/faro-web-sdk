import { faro, stringifyExternalJson } from '@grafana/faro-core';
import type { MetaSession } from '@grafana/faro-core';

import { getItem, removeItem, setItem, webStorageType } from '../../../utils/webStorage';

import { STORAGE_KEY, STORAGE_UPDATE_DELAY } from './sessionConstants';
import {
  getSessionMetaUpdateHandler,
  getUserSessionActivityRecorder,
  getUserSessionUpdater,
} from './sessionManagerUtils';
import type { FaroUserSession, SessionContext } from './types';

export class VolatileSessionsManager {
  private static storageTypeSession = webStorageType.session;
  private updateUserSession: ReturnType<typeof getUserSessionUpdater>;

  // Same-origin frames in a tab share sessionStorage but have separate Faro instances.
  private adopting = false;

  isAdopting = (): boolean => this.adopting;

  private adoptSession = (sessionMeta: MetaSession): void => {
    this.adopting = true;
    try {
      this.context.api?.setSession(sessionMeta);
    } finally {
      this.adopting = false;
    }
  };

  constructor(private readonly context: SessionContext = faro) {
    this.updateUserSession = getUserSessionUpdater(
      {
        fetchUserSession: VolatileSessionsManager.fetchUserSession,
        storeUserSession: VolatileSessionsManager.storeUserSession,
        updateInterval: STORAGE_UPDATE_DELAY,
        adoptSession: this.adoptSession,
      },
      context
    );

    this.init();
  }

  static removeUserSession(): void {
    removeItem(STORAGE_KEY, VolatileSessionsManager.storageTypeSession);
  }

  static storeUserSession(session: FaroUserSession): void {
    setItem(STORAGE_KEY, stringifyExternalJson(session), VolatileSessionsManager.storageTypeSession);
  }

  static fetchUserSession(): FaroUserSession | null {
    const storedSession = getItem(STORAGE_KEY, VolatileSessionsManager.storageTypeSession);

    if (storedSession) {
      return JSON.parse(storedSession) as FaroUserSession;
    }

    return null;
  }

  updateSession = ({ refreshActivity = true }: { refreshActivity?: boolean } = {}): void =>
    this.updateUserSession({ refreshActivity });

  recordActivity: (sessionId: string) => void = getUserSessionActivityRecorder({
    fetchUserSession: VolatileSessionsManager.fetchUserSession,
    storeUserSession: VolatileSessionsManager.storeUserSession,
    updateInterval: STORAGE_UPDATE_DELAY,
  });

  private init(): void {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.updateSession({ refreshActivity: false });
        const sessionId = this.context.api?.getSession()?.id;
        if (sessionId) {
          this.recordActivity(sessionId);
        }
      }
    });

    // Users can call the setSession() method, so we need to sync this with the local storage session
    this.context.metas.addListener(
      getSessionMetaUpdateHandler(
        {
          fetchUserSession: VolatileSessionsManager.fetchUserSession,
          storeUserSession: VolatileSessionsManager.storeUserSession,
        },
        this.context
      )
    );
  }
}
