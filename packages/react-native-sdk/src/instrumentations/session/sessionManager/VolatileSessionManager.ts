import {faro} from '@grafana/faro-core';
import type {Meta} from '@grafana/faro-core';

import {throttle} from '../../../utils';
import {stringifyExternalJson} from '../../../utils/json';

import {isSampled} from './sampling';
import {STORAGE_UPDATE_DELAY} from './sessionConstants';
import {addSessionMetadataToNextSession, createUserSessionObject, getUserSessionUpdater} from './sessionManagerUtils';
import type {FaroUserSession} from './types';

export class VolatileSessionsManager {
  private updateUserSession: ReturnType<typeof getUserSessionUpdater>;
  private static storedSession: string|null = null;
  constructor() {
    this.updateUserSession = getUserSessionUpdater({
      fetchUserSession: VolatileSessionsManager.fetchUserSession,
      storeUserSession: VolatileSessionsManager.storeUserSession,
    });

    this.init();
  }

  static removeUserSession() {
    this.storedSession = null;
  }

  static storeUserSession(session: FaroUserSession): void {
    this.storedSession = stringifyExternalJson(session)
  }

  static fetchUserSession(): FaroUserSession | null {
    if (this.storedSession) {
      return JSON.parse(this.storedSession) as FaroUserSession;
    }

    return null;
  }

  updateSession = throttle(() => this.updateUserSession(), STORAGE_UPDATE_DELAY);

  private init(): void {
    // Users can call the setSession() method, so we need to sync this with the local storage session
    faro.metas.addListener(function syncSessionIfChangedExternally(meta: Meta) {
      const session = meta.session;
      const sessionFromSessionStorage = VolatileSessionsManager.fetchUserSession();

      if (session && session.id !== sessionFromSessionStorage?.sessionId) {
        const userSession = addSessionMetadataToNextSession(
          createUserSessionObject({ sessionId: session.id, isSampled: isSampled() }),
          sessionFromSessionStorage
        );

        VolatileSessionsManager.storeUserSession(userSession);
        faro.api.setSession(userSession.sessionMeta);
      }
    });
  }
}
