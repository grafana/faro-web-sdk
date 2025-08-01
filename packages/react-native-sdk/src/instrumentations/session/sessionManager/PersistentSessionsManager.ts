import { faro } from '@grafana/faro-core';
import type { Meta } from '@grafana/faro-core';

import { stringifyExternalJson, throttle } from '../../../utils';
import { getItem, removeItem, setItem } from '../../../utils/asyncStorage';

import { isSampled } from './sampling';
import { STORAGE_KEY, STORAGE_UPDATE_DELAY } from './sessionConstants';
import { addSessionMetadataToNextSession, createUserSessionObject, getUserSessionUpdater } from './sessionManagerUtils';
import type { FaroUserSession } from './types';

export class PersistentSessionsManager {
  private updateUserSession: ReturnType<typeof getUserSessionUpdater>;

  constructor() {
    this.updateUserSession = getUserSessionUpdater({
      fetchUserSession: PersistentSessionsManager.fetchUserSession,
      storeUserSession: PersistentSessionsManager.storeUserSession,
    });

    this.init();
  }

  static async removeUserSession() {
    await removeItem(STORAGE_KEY);
  }

  static async storeUserSession(session: FaroUserSession): Promise<void> {
    await setItem(STORAGE_KEY, stringifyExternalJson(session));
  }

  static async fetchUserSession(): Promise<FaroUserSession | null> {
    const storedSession = await getItem(STORAGE_KEY);

    if (storedSession) {
      return JSON.parse(storedSession) as FaroUserSession;
    }

    return null;
  }

  updateSession = throttle(() => this.updateUserSession(), STORAGE_UPDATE_DELAY);

  private init(): void {
    // Users can call the setSession() method, so we need to sync this with the local storage session
    faro.metas.addListener(async function syncSessionIfChangedExternally(meta: Meta) {
      const session = meta.session;
      const sessionFromLocalStorage = await PersistentSessionsManager.fetchUserSession();

      if (session && session.id !== sessionFromLocalStorage?.sessionId) {
        const userSession = addSessionMetadataToNextSession(
          createUserSessionObject({ sessionId: session.id, isSampled: isSampled() }),
          sessionFromLocalStorage
        );

        await PersistentSessionsManager.storeUserSession(userSession);
        faro.api.setSession(userSession.sessionMeta);
      }
    });
  }
}
