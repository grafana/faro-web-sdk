import { faro, stringifyExternalJson } from '@grafana/faro-core';
import type { Meta } from '@grafana/faro-core';

import { getItem, removeItem, setItem, webStorageType } from '../../../utils/webStorage';

import { STORAGE_KEY, STORAGE_UPDATE_DELAY } from './sessionConstants';
import {
  getSessionMetaUpdateHandler,
  getUserSessionActivityRecorder,
  getUserSessionUpdater,
} from './sessionManagerUtils';
import type { FaroUserSession } from './types';

export class VolatileSessionsManager {
  private static storageTypeSession = webStorageType.session;
  private updateUserSession: ReturnType<typeof getUserSessionUpdater>;
  private readonly metas = faro.metas;
  private active = true;
  private metaListener?: (meta: Meta) => void;
  private readonly isActive = (): boolean => this.active;

  // sessionStorage is tab-local, so this manager never adopts another tab's
  // session. Stubbed so the instrumentation can treat both managers uniformly.
  isAdopting = (): boolean => false;

  constructor() {
    this.updateUserSession = getUserSessionUpdater({
      fetchUserSession: VolatileSessionsManager.fetchUserSession,
      storeUserSession: this.storeSession,
      updateInterval: STORAGE_UPDATE_DELAY,
      isActive: this.isActive,
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

  storeSession = (session: FaroUserSession): void => {
    const serialized = stringifyExternalJson(session);
    if (this.active) {
      setItem(STORAGE_KEY, serialized, VolatileSessionsManager.storageTypeSession);
    }
  };

  updateSession = ({ refreshActivity = true }: { refreshActivity?: boolean } = {}): void =>
    this.updateUserSession({ refreshActivity });

  recordActivity: (sessionId: string) => void = getUserSessionActivityRecorder({
    fetchUserSession: VolatileSessionsManager.fetchUserSession,
    storeUserSession: this.storeSession,
    updateInterval: STORAGE_UPDATE_DELAY,
    isActive: this.isActive,
  });

  private readonly visibilityListener = (): void => {
    if (this.active && document.visibilityState === 'visible') {
      this.updateSession({ refreshActivity: false });
      const sessionId = this.metas.value.session?.id;
      if (this.active && sessionId) {
        this.recordActivity(sessionId);
      }
    }
  };

  private init(): void {
    try {
      this.metaListener = getSessionMetaUpdateHandler({
        fetchUserSession: VolatileSessionsManager.fetchUserSession,
        storeUserSession: this.storeSession,
        isActive: this.isActive,
      });
      document.addEventListener('visibilitychange', this.visibilityListener);
      this.metas.addListener(this.metaListener);
    } catch (error) {
      this.dispose();
      throw error;
    }
  }

  dispose(): void {
    if (!this.active) {
      return;
    }
    this.active = false;
    try {
      if (this.metaListener) {
        this.metas.removeListener(this.metaListener);
      }
    } finally {
      document.removeEventListener('visibilitychange', this.visibilityListener);
    }
  }
}
