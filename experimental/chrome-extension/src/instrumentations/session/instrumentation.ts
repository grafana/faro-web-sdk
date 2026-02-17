import {
  BaseInstrumentation,
  dateNow,
  EVENT_SESSION_RESUME,
  EVENT_SESSION_START,
  genShortID,
  stringifyExternalJson,
  VERSION,
} from '@grafana/faro-core';
import type { MetaSession } from '@grafana/faro-core';

import { createSession } from '@grafana/faro-web-sdk';

const STORAGE_KEY = 'com.grafana.faro.session';
const SESSION_EXPIRATION_TIME = 4 * 60 * 60 * 1000;
const SESSION_INACTIVITY_TIME = 15 * 60 * 1000;

interface FaroUserSession {
  sessionId: string;
  lastActivity: number;
  started: number;
  isSampled: boolean;
  sessionMeta?: MetaSession;
}

export class ExtensionSessionInstrumentation extends BaseInstrumentation {
  readonly name = '@grafana/faro-chrome-extension:instrumentation-session';
  readonly version = VERSION;

  initialize(): void {
    this.logDebug('Initializing extension session');
    this.initializeSession();
  }

  private async initializeSession(): Promise<void> {
    const storedSession = await this.fetchSession();
    let session: FaroUserSession;
    let lifecycleType: typeof EVENT_SESSION_START | typeof EVENT_SESSION_RESUME;

    if (storedSession && this.isSessionValid(storedSession)) {
      session = {
        ...storedSession,
        lastActivity: dateNow(),
      };
      session.sessionMeta = {
        ...storedSession.sessionMeta,
        id: storedSession.sessionId,
        attributes: {
          ...storedSession.sessionMeta?.attributes,
          isSampled: storedSession.isSampled.toString(),
        },
      };
      lifecycleType = EVENT_SESSION_RESUME;
    } else {
      const sessionId = createSession().id ?? genShortID();
      const now = dateNow();
      session = {
        sessionId,
        lastActivity: now,
        started: now,
        isSampled: true,
        sessionMeta: {
          id: sessionId,
          attributes: {
            isSampled: 'true',
            ...(storedSession?.sessionId ? { previousSession: storedSession.sessionId } : {}),
          },
        },
      };
      lifecycleType = EVENT_SESSION_START;
    }

    await this.storeSession(session);

    this.api.setSession(session.sessionMeta);

    this.api.pushEvent(lifecycleType, {}, undefined, { skipDedupe: true });
  }

  private isSessionValid(session: FaroUserSession): boolean {
    const now = dateNow();
    const lifetimeValid = now - session.started < SESSION_EXPIRATION_TIME;
    if (!lifetimeValid) {
      return false;
    }
    return now - session.lastActivity < SESSION_INACTIVITY_TIME;
  }

  private async fetchSession(): Promise<FaroUserSession | null> {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEY);
      const stored = result[STORAGE_KEY];
      if (stored) {
        return JSON.parse(stored) as FaroUserSession;
      }
    } catch {
      // Storage unavailable
    }
    return null;
  }

  private async storeSession(session: FaroUserSession): Promise<void> {
    try {
      await chrome.storage.local.set({ [STORAGE_KEY]: stringifyExternalJson(session) });
    } catch {
      // Storage unavailable
    }
  }
}
