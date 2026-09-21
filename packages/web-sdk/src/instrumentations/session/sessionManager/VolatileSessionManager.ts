import { faro, stringifyExternalJson } from '@grafana/faro-core';

import { getItem, removeItem, setItem, webStorageType } from '../../../utils/webStorage';

import { STORAGE_KEY, STORAGE_UPDATE_DELAY } from './sessionConstants';
import {
  getSessionMetaUpdateHandler,
  getUserSessionActivityRecorder,
  getUserSessionUpdater,
  type UserSessionUpdaterContext,
} from './sessionManagerUtils';
import type { FaroUserSession } from './types';

export class VolatileSessionsManager {
  private static storageTypeSession = webStorageType.session;
  private updateUserSession: ReturnType<typeof getUserSessionUpdater>;

  // sessionStorage is tab-local, so this manager never adopts another tab's
  // session. Stubbed so the instrumentation can treat both managers uniformly.
  isAdopting = (): boolean => false;

  constructor(private readonly context: UserSessionUpdaterContext | undefined = undefined) {
    this.updateUserSession = getUserSessionUpdater({
      fetchUserSession: VolatileSessionsManager.fetchUserSession,
      storeUserSession: VolatileSessionsManager.storeUserSession,
      updateInterval: STORAGE_UPDATE_DELAY,
      context,
    });

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
        const sessionId = this.context?.getInMemorySessionId?.() ?? faro.api?.getSession()?.id;
        if (sessionId) {
          this.recordActivity(sessionId);
        }
      }
    });

    const metas = this.context?.metas ?? faro.metas;
    metas.addListener(
      getSessionMetaUpdateHandler({
        fetchUserSession: VolatileSessionsManager.fetchUserSession,
        storeUserSession: VolatileSessionsManager.storeUserSession,
        context: this.context,
      })
    );
  }
}
