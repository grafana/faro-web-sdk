import {
  BaseInstrumentation,
  dateNow,
  EVENT_SESSION_EXTEND,
  EVENT_SESSION_RESUME,
  EVENT_SESSION_START,
  Meta,
  MetaSession,
  VERSION,
} from '@grafana/faro-core';
import type { Config } from '@grafana/faro-core';

import type { TransportItem } from '../..';
import { createSession } from '../../metas';

import { type FaroUserSession, isSampled } from './sessionManager';
import { PersistentSessionsManager } from './sessionManager/PersistentSessionsManager';
import { createUserSessionObject, isUserSessionValid } from './sessionManager/sessionManagerUtils';
import { VolatileSessionsManager } from './sessionManager/VolatileSessionManager';

type LifecycleType = typeof EVENT_SESSION_RESUME | typeof EVENT_SESSION_START;

export class SessionInstrumentation extends BaseInstrumentation {
  readonly name = '@grafana/faro-web-sdk:instrumentation-session';
  readonly version = VERSION;

  // previously notified session, to ensure we don't send session start
  // event twice for the same session
  private notifiedSession: MetaSession | undefined;

  private sendSessionStartEvent(meta: Meta): void {
    const session = meta.session;

    if (session && session.id !== this.notifiedSession?.id) {
      if (this.notifiedSession && this.notifiedSession.id === session.attributes?.['previousSession']) {
        this.api.pushEvent(EVENT_SESSION_EXTEND, {}, undefined, { skipDedupe: true });
        this.notifiedSession = session;
        return;
      }

      this.notifiedSession = session;
      // no need to add attributes and session id, they are included as part of meta
      // automatically
      this.api.pushEvent(EVENT_SESSION_START, {}, undefined, { skipDedupe: true });
    }
  }

  private createInitialSessionMeta(sessionsConfig: Required<Config>['sessionTracking']): {
    sessionMeta: MetaSession;
    lifecycleType: LifecycleType;
  } {
    const sessionManager = sessionsConfig.persistent ? PersistentSessionsManager : VolatileSessionsManager;

    let userSession: FaroUserSession | null = sessionManager.fetchUserSession();

    if (sessionsConfig.persistent && sessionsConfig.maxSessionPersistenceTime && userSession) {
      const now = dateNow();
      const shouldClearPersistentSession = userSession.lastActivity < now - sessionsConfig.maxSessionPersistenceTime;

      if (shouldClearPersistentSession) {
        PersistentSessionsManager.removeUserSession();
        userSession = null;
      }
    }

    let sessionId = sessionsConfig.session?.id;
    let sessionAttributes = sessionsConfig.session?.attributes;

    let lifecycleType: LifecycleType;

    if (isUserSessionValid(userSession)) {
      sessionId = userSession?.sessionId;
      sessionAttributes = {
        ...sessionAttributes,
        ...userSession?.sessionMeta?.attributes,
        isSampled: (userSession!.isSampled || false).toString(),
      };

      lifecycleType = EVENT_SESSION_RESUME;
    } else {
      sessionId = sessionId ?? createSession().id;
      lifecycleType = EVENT_SESSION_START;
    }

    const sessionMeta: MetaSession = {
      id: sessionId,
      attributes: {
        isSampled: isSampled().toString(),
        // We do not want to recalculate the sampling decision on each init phase.
        // If session from web-storage has a isSampled attribute we will use that instead.
        ...sessionAttributes,
      },
    };

    return { sessionMeta, lifecycleType };
  }

  private registerBeforeSendHook(SessionManager: typeof VolatileSessionsManager | typeof PersistentSessionsManager) {
    const { updateSession } = new SessionManager();

    this.transports?.addBeforeSendHooks((item) => {
      updateSession();

      const attributes = item.meta.session?.attributes;

      if (attributes && attributes?.['isSampled'] === 'true') {
        let newItem: TransportItem;

        // Structured clone is supported in all major browsers
        // but for old browsers we need a fallback
        if ('structuredClone' in window) {
          newItem = structuredClone(item);
        } else {
          newItem = JSON.parse(JSON.stringify(item));
        }

        const newAttributes = newItem.meta.session?.attributes;
        delete newAttributes?.['isSampled'];

        if (Object.keys(newAttributes ?? {}).length === 0) {
          delete newItem.meta.session?.attributes;
        }

        return newItem;
      }

      return null;
    });
  }

  initialize() {
    this.logDebug('init session instrumentation');

    const sessionTracking = this.config.sessionTracking;

    if (sessionTracking?.enabled) {
      const SessionManager = this.config.sessionTracking?.persistent
        ? PersistentSessionsManager
        : VolatileSessionsManager;

      this.registerBeforeSendHook(SessionManager);

      const { sessionMeta: initialSessionMeta, lifecycleType } = this.createInitialSessionMeta(sessionTracking);

      SessionManager.storeUserSession({
        ...createUserSessionObject({
          sessionId: initialSessionMeta.id,
          isSampled: initialSessionMeta.attributes?.['isSampled'] === 'true',
        }),
        sessionMeta: initialSessionMeta,
      });

      this.notifiedSession = initialSessionMeta;
      this.api.setSession(initialSessionMeta);

      if (lifecycleType === EVENT_SESSION_START) {
        this.api.pushEvent(EVENT_SESSION_START, {}, undefined, { skipDedupe: true });
      }

      if (lifecycleType === EVENT_SESSION_RESUME) {
        this.api.pushEvent(EVENT_SESSION_RESUME, {}, undefined, { skipDedupe: true });
      }
    }

    this.metas.addListener(this.sendSessionStartEvent.bind(this));
  }
}
