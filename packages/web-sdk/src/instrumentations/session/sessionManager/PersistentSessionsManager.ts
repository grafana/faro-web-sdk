import { faro, stringifyExternalJson } from '@grafana/faro-core';
import type { MetaSession } from '@grafana/faro-core';

import { throttle } from '../../../utils';
import { getItem, removeItem, setItem, webStorageType } from '../../../utils/webStorage';

import { getSessionStorageKey } from './getSessionStorageKey';
import { STORAGE_UPDATE_DELAY } from './sessionConstants';
import { getSessionMetaUpdateHandler, getUserSessionUpdater } from './sessionManagerUtils';
import type { FaroUserSession, SessionManagerDeps } from './types';

export class PersistentSessionsManager {
  private static storageTypeLocal = webStorageType.local;
  private readonly namespace?: string;
  private readonly faroApi: NonNullable<SessionManagerDeps['api']>;
  private updateUserSession: ReturnType<typeof getUserSessionUpdater>;

  // Set only for the synchronous span of an adopting setSession(); the session
  // instrumentation reads isAdopting() to suppress its lifecycle event.
  private adopting = false;

  isAdopting = (): boolean => this.adopting;

  private adoptSession = (sessionMeta: MetaSession): void => {
    this.adopting = true;
    try {
      this.faroApi?.setSession(sessionMeta);
    } finally {
      this.adopting = false;
    }
  };

  constructor(namespace?: string, deps?: SessionManagerDeps) {
    const { config, metas, api } = deps ?? { config: faro.config, metas: faro.metas, api: faro.api };
    this.namespace = namespace;
    this.faroApi = api;
    this.updateUserSession = getUserSessionUpdater({
      fetchUserSession: this.fetchUserSession,
      storeUserSession: this.storeUserSession,
      adoptSession: this.adoptSession,
      config,
      metas,
      api,
    });

    this.init(metas, config, api);
  }

  // Static helpers kept for backwards compatibility and for side-effect-free storage access
  // (no listeners are registered). Zero-arg calls address the bare (non-namespaced) key,
  // matching the historical behavior; pass a namespace to address an isolated instance's storage.
  static removeUserSession(namespace?: string): void {
    removeItem(getSessionStorageKey(namespace), PersistentSessionsManager.storageTypeLocal);
  }

  static storeUserSession(session: FaroUserSession, namespace?: string): void {
    setItem(
      getSessionStorageKey(namespace),
      stringifyExternalJson(session),
      PersistentSessionsManager.storageTypeLocal
    );
  }

  static fetchUserSession(namespace?: string): FaroUserSession | null {
    const storedSession = getItem(getSessionStorageKey(namespace), PersistentSessionsManager.storageTypeLocal);

    if (storedSession) {
      return JSON.parse(storedSession) as FaroUserSession;
    }

    return null;
  }

  removeUserSession = (): void => {
    PersistentSessionsManager.removeUserSession(this.namespace);
  };

  storeUserSession = (session: FaroUserSession): void => {
    PersistentSessionsManager.storeUserSession(session, this.namespace);
  };

  fetchUserSession = (): FaroUserSession | null => {
    return PersistentSessionsManager.fetchUserSession(this.namespace);
  };

  updateSession = throttle(() => this.updateUserSession(), STORAGE_UPDATE_DELAY);

  private init(
    metas: SessionManagerDeps['metas'],
    config: SessionManagerDeps['config'],
    api: SessionManagerDeps['api']
  ): void {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.updateSession();
      }
    });

    // Users can call the setSession() method, so we need to sync this with the local storage session.
    // Guard: metas is only available after initializeFaro(); construction before that is
    // supported for testing (e.g. getting method refs) but skips the meta listener.
    metas?.addListener(
      getSessionMetaUpdateHandler({
        fetchUserSession: this.fetchUserSession,
        storeUserSession: this.storeUserSession,
        config,
        metas,
        api,
      })
    );
  }
}
