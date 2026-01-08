import { AppState, type AppStateStatus } from 'react-native';

import { faro } from '@grafana/faro-core';

import { throttle } from '../../../utils/throttle';

import { STORAGE_UPDATE_DELAY } from './sessionConstants';
import { getSessionMetaUpdateHandler, getUserSessionUpdater } from './sessionManagerUtils';
import type { FaroUserSession } from './types';

export class VolatileSessionsManager {
  private static volatileStorage: FaroUserSession | null = null;
  private updateUserSession: ReturnType<typeof getUserSessionUpdater>;
  private appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;
  private metaListener: ReturnType<typeof getSessionMetaUpdateHandler> | null = null;

  constructor() {
    this.updateUserSession = getUserSessionUpdater({
      fetchUserSession: VolatileSessionsManager.fetchUserSession,
      storeUserSession: VolatileSessionsManager.storeUserSession,
    });

    this.init();
  }

  static removeUserSession(): void {
    VolatileSessionsManager.volatileStorage = null;
  }

  static storeUserSession(session: FaroUserSession): void {
    VolatileSessionsManager.volatileStorage = session;
  }

  static fetchUserSession(): FaroUserSession | null {
    return VolatileSessionsManager.volatileStorage;
  }

  updateSession = throttle(() => this.updateUserSession(), STORAGE_UPDATE_DELAY);

  private handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
      this.updateSession();
    }
  };

  private init(): void {
    // Listen to app state changes (equivalent to visibilitychange in web)
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);

    // Users can call the setSession() method, so we need to sync this with the in-memory session
    this.metaListener = getSessionMetaUpdateHandler({
      fetchUserSession: VolatileSessionsManager.fetchUserSession,
      storeUserSession: VolatileSessionsManager.storeUserSession,
    });
    faro.metas.addListener(this.metaListener);
  }

  /**
   * Clean up listeners when the instrumentation is unpatched
   */
  unpatch(): void {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }

    if (this.metaListener) {
      faro.metas.removeListener(this.metaListener);
      this.metaListener = null;
    }
  }
}
