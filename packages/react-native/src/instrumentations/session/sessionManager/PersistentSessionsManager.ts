import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, type AppStateStatus } from 'react-native';

import { faro, stringifyExternalJson } from '@grafana/faro-core';

import { throttle } from '../../../utils/throttle';

import { STORAGE_KEY, STORAGE_UPDATE_DELAY } from './sessionConstants';
import { getSessionMetaUpdateHandler, getUserSessionUpdater } from './sessionManagerUtils';
import type { FaroUserSession } from './types';

export class PersistentSessionsManager {
  private updateUserSession: ReturnType<typeof getUserSessionUpdater>;
  private appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;
  private metaListener: ReturnType<typeof getSessionMetaUpdateHandler> | null = null;

  constructor() {
    this.updateUserSession = getUserSessionUpdater({
      fetchUserSession: PersistentSessionsManager.fetchUserSession,
      storeUserSession: PersistentSessionsManager.storeUserSession,
    });

    this.init();
  }

  static async removeUserSession(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      // Silently fail - AsyncStorage errors shouldn't break the app
      faro.unpatchedConsole?.warn?.('Failed to remove session from AsyncStorage:', error);
    }
  }

  static async storeUserSession(session: FaroUserSession): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, stringifyExternalJson(session));
    } catch (error) {
      // Silently fail - AsyncStorage errors shouldn't break the app
      faro.unpatchedConsole?.warn?.('Failed to store session in AsyncStorage:', error);
    }
  }

  static async fetchUserSession(): Promise<FaroUserSession | null> {
    try {
      const storedSession = await AsyncStorage.getItem(STORAGE_KEY);

      if (storedSession) {
        return JSON.parse(storedSession) as FaroUserSession;
      }

      return null;
    } catch (error) {
      // Silently fail - AsyncStorage errors shouldn't break the app
      faro.unpatchedConsole?.warn?.('Failed to fetch session from AsyncStorage:', error);
      return null;
    }
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

    // Users can call the setSession() method, so we need to sync this with AsyncStorage
    this.metaListener = getSessionMetaUpdateHandler({
      fetchUserSession: PersistentSessionsManager.fetchUserSession,
      storeUserSession: PersistentSessionsManager.storeUserSession,
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
