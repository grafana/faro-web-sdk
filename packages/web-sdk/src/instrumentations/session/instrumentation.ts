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

import { createSession } from '../../metas';

import { type FaroUserSession, isSampled } from './sessionManager';
import { PersistentSessionsManager } from './sessionManager/PersistentSessionsManager';
import { createUserSessionObject, isUserSessionValid } from './sessionManager/sessionManagerUtils';
import { VolatileSessionsManager } from './sessionManager/VolatileSessionManager';

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

  private createInitialSessionMeta(sessionsConfig: Required<Config>['sessionTracking']): MetaSession {
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

    if (isUserSessionValid(userSession)) {
      sessionId = userSession?.sessionId;
      sessionAttributes = {
        ...userSession?.sessionMeta?.attributes,
        isSampled: userSession!.isSampled.toString(),
      };
      this.api.pushEvent(EVENT_SESSION_RESUME, {}, undefined, { skipDedupe: true });
    } else {
      sessionId = sessionId ?? createSession().id;
      this.api.pushEvent(EVENT_SESSION_START, {}, undefined, { skipDedupe: true });
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

    return sessionMeta;
  }

  initialize() {
    this.logDebug('init session instrumentation');

    const sessionTracking = this.config.sessionTracking;

    if (sessionTracking?.enabled) {
      const SessionManager = this.config.sessionTracking?.persistent
        ? PersistentSessionsManager
        : VolatileSessionsManager;

      const initialSessionMeta = this.createInitialSessionMeta(sessionTracking);

      SessionManager.storeUserSession(
        createUserSessionObject({
          sessionId: initialSessionMeta.id,
          isSampled: Boolean(initialSessionMeta.attributes!['isSampled']),
        })
      );

      this.notifiedSession = initialSessionMeta;
      this.api.setSession(initialSessionMeta);

      const { updateSession } = new SessionManager();

      this.transports?.addBeforeSendHooks((item) => {
        updateSession();

        const attributes = item.meta.session?.attributes;

        if (attributes && Boolean(attributes?.['isSampled'])) {
          const { isSampled: _, ...restAttributes } = attributes;

          item.meta.session = {
            ...item.meta.session,
            attributes: restAttributes,
          };

          return item;
        }

        return null;
      });
    } else {
      this.sendSessionStartEvent(this.metas.value);
    }

    this.metas.addListener(this.sendSessionStartEvent.bind(this));
  }
}
