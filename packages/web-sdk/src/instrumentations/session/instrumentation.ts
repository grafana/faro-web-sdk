import {
  BaseInstrumentation,
  dateNow,
  EVENT_SESSION_EXTEND,
  EVENT_SESSION_RESUME,
  EVENT_SESSION_START,
  VERSION,
} from '@grafana/faro-core';
import type { BeforeSendHook, Config, Meta, MetaSession } from '@grafana/faro-core';

import type { TransportItem } from '../..';
import { createSession } from '../../metas';

import { type FaroUserSession, getSessionManagerByConfig, isSampled } from './sessionManager';
import { PersistentSessionsManager } from './sessionManager/PersistentSessionsManager';
import { createUserSessionObject, isUserSessionValid } from './sessionManager/sessionManagerUtils';
import type { SessionManager } from './sessionManager/types';

type LifecycleType = typeof EVENT_SESSION_RESUME | typeof EVENT_SESSION_START;

export class SessionInstrumentation extends BaseInstrumentation {
  readonly name = '@grafana/faro-web-sdk:instrumentation-session';
  readonly version: string = VERSION;

  // previously notified session, to ensure we don't send session start
  // event twice for the same session
  private notifiedSession: MetaSession | undefined;

  // Reads the session manager's adoption flag (set once the manager exists).
  private isAdoptingSession: () => boolean = () => false;
  private captureListener: (() => void) | undefined;
  private beforeSendHook: BeforeSendHook | undefined;
  private sessionStartListener: ((meta: Meta) => void) | undefined;

  private sendSessionStartEvent(meta: Meta): void {
    const session = meta.session;

    if (session && session.id !== this.notifiedSession?.id) {
      // Adopting another tab's session: track it but emit nothing (the creating tab already did).
      if (this.isAdoptingSession()) {
        this.notifiedSession = session;
        return;
      }

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

  private createInitialSession(
    SessionManager: SessionManager,
    sessionsConfig: Required<Config>['sessionTracking']
  ): {
    initialSession: FaroUserSession;
    lifecycleType: LifecycleType;
  } {
    let storedUserSession: FaroUserSession | null = SessionManager.fetchUserSession();

    if (sessionsConfig.persistent && sessionsConfig.maxSessionPersistenceTime && storedUserSession) {
      const now = dateNow();
      const shouldClearPersistentSession =
        storedUserSession.lastActivity < now - sessionsConfig.maxSessionPersistenceTime;

      if (shouldClearPersistentSession) {
        PersistentSessionsManager.removeUserSession();
        storedUserSession = null;
      }
    }

    let lifecycleType: LifecycleType;
    let initialSession: FaroUserSession;

    if (isUserSessionValid(storedUserSession)) {
      const sessionId = storedUserSession?.sessionId;

      initialSession = createUserSessionObject({
        sessionId,
        isSampled: storedUserSession!.isSampled || false,
        started: storedUserSession?.started,
      });

      const storedUserSessionMeta = storedUserSession?.sessionMeta;

      // For resumed sessions we want to merge the previous overrides with the configured ones.
      // If the same key is present in both, the new one will override the old one.
      const overrides = { ...sessionsConfig.session?.overrides, ...storedUserSessionMeta?.overrides };

      initialSession.sessionMeta = {
        ...sessionsConfig.session,
        id: sessionId,
        attributes: {
          ...sessionsConfig.session?.attributes,
          ...storedUserSessionMeta?.attributes,
          // For valid resumed sessions we do not want to recalculate the sampling decision on each init phase.
          isSampled: initialSession.isSampled.toString(),
        },
        overrides,
      };

      lifecycleType = EVENT_SESSION_RESUME;
    } else {
      const sessionId = sessionsConfig.session?.id ?? createSession().id;

      initialSession = createUserSessionObject({
        sessionId,
        isSampled: isSampled(),
      });

      const overrides = sessionsConfig.session?.overrides;

      initialSession.sessionMeta = {
        id: sessionId,
        attributes: {
          isSampled: initialSession.isSampled.toString(),
          ...sessionsConfig.session?.attributes,
        },
        // new session we don't care about previous overrides
        ...(overrides ? { overrides } : {}),
      };

      lifecycleType = EVENT_SESSION_START;
    }

    return { initialSession, lifecycleType };
  }

  private registerBeforeSendHook(recordActivity: (sessionId: string) => void) {
    this.beforeSendHook = (item) => {
      // config.beforeSend runs before this hook. Sampling and hooks added later
      // retain their existing order and do not undo session activity.
      const sessionId = item.meta.session?.id;
      if (sessionId && !this.transports.isPaused()) {
        recordActivity(sessionId);
      }
      // Delivery filters using the captured session's sampling decision. It must
      // never rotate or reassign an item that already belongs to a session.
      const attributes = item.meta.session?.attributes;

      if (attributes && attributes?.['isSampled'] === 'true') {
        let newItem: TransportItem = JSON.parse(JSON.stringify(item));

        const newAttributes = newItem.meta.session?.attributes;
        delete newAttributes?.['isSampled'];

        if (Object.keys(newAttributes ?? {}).length === 0) {
          delete newItem.meta.session?.attributes;
        }

        return newItem;
      }

      return null;
    };
    this.transports?.addBeforeSendHooks(this.beforeSendHook);
  }

  initialize(): void {
    this.logDebug('init session instrumentation');

    const sessionTrackingConfig = this.config.sessionTracking;

    if (sessionTrackingConfig?.enabled) {
      const SessionManager = getSessionManagerByConfig(sessionTrackingConfig);

      const sessionManager = new SessionManager();
      this.isAdoptingSession = sessionManager.isAdopting;
      this.registerBeforeSendHook(sessionManager.recordActivity);

      const { initialSession, lifecycleType } = this.createInitialSession(SessionManager, sessionTrackingConfig);

      SessionManager.storeUserSession(initialSession);

      const initialSessionMeta = initialSession.sessionMeta;

      this.notifiedSession = initialSessionMeta;
      this.api.setSession(initialSessionMeta);
      this.captureListener = () => {
        if (!this.transports.isPaused()) {
          sessionManager.updateSession();
        }
      };
      this.metas.addCaptureListener(this.captureListener);

      if (lifecycleType === EVENT_SESSION_START) {
        this.api.pushEvent(EVENT_SESSION_START, {}, undefined, { skipDedupe: true });
      }

      if (lifecycleType === EVENT_SESSION_RESUME) {
        this.api.pushEvent(EVENT_SESSION_RESUME, {}, undefined, { skipDedupe: true });
      }
    }

    this.sessionStartListener = this.sendSessionStartEvent.bind(this);
    this.metas.addListener(this.sessionStartListener);
  }

  destroy(): void {
    if (this.captureListener) {
      this.metas.removeCaptureListener(this.captureListener);
      this.captureListener = undefined;
    }
    if (this.beforeSendHook) {
      this.transports.removeBeforeSendHooks(this.beforeSendHook);
      this.beforeSendHook = undefined;
    }
    if (this.sessionStartListener) {
      this.metas.removeListener(this.sessionStartListener);
      this.sessionStartListener = undefined;
    }
  }
}
