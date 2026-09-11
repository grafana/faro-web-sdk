import { faro, stringifyExternalJson } from '@grafana/faro-core';
import type { Meta, MetaSession } from '@grafana/faro-core';

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
  private readonly metas = faro.metas;
  private active = true;
  private metaListener?: (meta: Meta) => void;
  private readonly isActive = (): boolean => this.active;

  // Set only for the synchronous span of an adopting setSession(); the session
  // instrumentation reads isAdopting() to suppress its lifecycle event.
  private adopting = false;

  isAdopting = (): boolean => this.adopting;

  private adoptSession = (sessionMeta: MetaSession): void => {
    if (!this.active) {
      return;
    }
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
      storeUserSession: this.storeSession,
      adoptSession: this.adoptSession,
      updateInterval: STORAGE_UPDATE_DELAY,
      isActive: this.isActive,
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

  storeSession = (session: FaroUserSession): void => {
    const serialized = stringifyExternalJson(session);
    if (this.active) {
      setItem(STORAGE_KEY, serialized, PersistentSessionsManager.storageTypeLocal);
    }
  };

  updateSession = ({ refreshActivity = true }: { refreshActivity?: boolean } = {}): void =>
    this.updateUserSession({ refreshActivity });

  recordActivity: (sessionId: string) => void = getUserSessionActivityRecorder({
    fetchUserSession: PersistentSessionsManager.fetchUserSession,
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
        fetchUserSession: PersistentSessionsManager.fetchUserSession,
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
