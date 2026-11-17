import {
  BaseInstrumentation,
  dateNow,
  EVENT_SESSION_EXTEND,
  EVENT_SESSION_RESUME,
  EVENT_SESSION_START,
  VERSION,
} from '@grafana/faro-core';
import type { BeforeSendHook, Config, Meta, MetaSession } from '@grafana/faro-core';
import { getInternalMetas } from '@grafana/faro-core/internal';

import { registerLegacySampling } from './legacySampling';
import { type PendingSessionChanges, PrerenderSession } from './prerenderSession';
import { type FaroUserSession, getSessionManagerByConfig } from './sessionManager';
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
  private prerenderSession: PrerenderSession | undefined;
  private removeLegacySampling: (() => void) | undefined;

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
    sessionsConfig: Required<Config>['sessionTracking'],
    pendingChanges?: PendingSessionChanges
  ): {
    initialSession: FaroUserSession;
    lifecycleType: LifecycleType;
  } {
    const pendingSession = pendingChanges?.session;
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
    const hasValidStoredSession = isUserSessionValid(storedUserSession);

    if (
      !pendingChanges?.reset &&
      hasValidStoredSession &&
      (!pendingSession?.id || pendingSession.id === storedUserSession?.sessionId)
    ) {
      const sessionId = storedUserSession?.sessionId;

      initialSession = createUserSessionObject(
        {
          sessionId,
          sampling: storedUserSession!.sampling,
          started: storedUserSession?.started,
        },
        this
      );
      // Read decisions written by earlier 2.x versions when resuming storage.
      const legacyDecision = (storedUserSession as FaroUserSession & { isSampled?: boolean }).isSampled;
      if (typeof legacyDecision === 'boolean') {
        (initialSession as FaroUserSession & { isSampled?: boolean }).isSampled = legacyDecision;
      }

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
        },
        overrides,
      };

      lifecycleType = EVENT_SESSION_RESUME;
    } else {
      initialSession = createUserSessionObject(
        {
          sessionId: pendingChanges?.reset ? undefined : (pendingSession?.id ?? sessionsConfig.session?.id),
        },
        this
      );
      const sessionId = initialSession.sessionId;

      // A pending reset or replacement inherits the session it would have updated
      // after normal initialization, including overrides read from storage at activation.
      const storedOverrides =
        pendingChanges && hasValidStoredSession ? storedUserSession?.sessionMeta?.overrides : undefined;
      const overrides = storedOverrides
        ? { ...sessionsConfig.session?.overrides, ...storedOverrides }
        : sessionsConfig.session?.overrides;

      initialSession.sessionMeta = {
        id: sessionId,
        attributes: {
          ...sessionsConfig.session?.attributes,
        },
        ...(overrides ? { overrides } : {}),
      };

      lifecycleType = EVENT_SESSION_START;
    }

    if (pendingSession) {
      initialSession.sessionMeta = {
        ...initialSession.sessionMeta,
        attributes: {
          ...initialSession.sessionMeta?.attributes,
          ...pendingSession.attributes,
        },
      };
      if (pendingSession.overrides) {
        const overrides = pendingChanges?.inheritOverrides
          ? { ...initialSession.sessionMeta.overrides, ...pendingSession.overrides }
          : pendingSession.overrides;
        if (Object.keys(overrides).length > 0) {
          initialSession.sessionMeta.overrides = overrides;
        } else {
          delete initialSession.sessionMeta.overrides;
        }
      }
    }

    if (initialSession.sessionMeta?.attributes) {
      delete initialSession.sessionMeta.attributes['isSampled'];
      if (Object.keys(initialSession.sessionMeta.attributes).length === 0) {
        delete initialSession.sessionMeta.attributes;
      }
    }

    return { initialSession, lifecycleType };
  }

  private registerBeforeSendHook(recordActivity: (sessionId: string) => void) {
    this.beforeSendHook = (item) => {
      // config.beforeSend runs before this hook. Keep session activity recording.
      const sessionId = item.meta.session?.id;
      if (sessionId && !this.transports.isPaused()) {
        recordActivity(sessionId);
      }
      return item;
    };
    this.transports?.addBeforeSendHooks(this.beforeSendHook);
  }

  initialize(): void {
    this.logDebug('init session instrumentation');

    const prerendering = (document as Document & { prerendering?: boolean }).prerendering;
    if (this.config.sessionTracking?.enabled && (prerendering || this.prerenderSession)) {
      // Chromium discards speculative sessionStorage writes on activation.
      this.prerenderSession ??= new PrerenderSession(this.metas, this.transports, (changes) => {
        this.prerenderSession = undefined;
        this.initializeSession(changes);
      });
      this.prerenderSession.initialize();
      return;
    }

    this.initializeSession();
  }

  private initializeSession(pendingChanges?: PendingSessionChanges): void {
    const sessionTrackingConfig = this.config.sessionTracking;
    if (sessionTrackingConfig?.enabled) {
      const SessionManager = getSessionManagerByConfig(sessionTrackingConfig);

      const sessionManager = new SessionManager(this);
      this.removeLegacySampling = registerLegacySampling(
        this,
        SessionManager.storeUserSession,
        sessionManager.recordActivity
      );
      this.isAdoptingSession = sessionManager.isAdopting;
      this.registerBeforeSendHook(sessionManager.recordActivity);

      const { initialSession, lifecycleType } = this.createInitialSession(
        SessionManager,
        sessionTrackingConfig,
        pendingChanges
      );

      SessionManager.storeUserSession(initialSession);
      getInternalMetas(this.metas).notifySessionCreated(
        initialSession,
        lifecycleType === EVENT_SESSION_RESUME ? 'resume' : 'start'
      );

      const initialSessionMeta = initialSession.sessionMeta;

      this.notifiedSession = initialSessionMeta;
      this.api.setSession(initialSessionMeta);
      this.captureListener = () => {
        if (!this.transports.isPaused()) {
          sessionManager.updateSession({ refreshActivity: false });
        }
      };
      this.metas.addCaptureListener?.(this.captureListener);

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
    this.removeLegacySampling?.();
    this.removeLegacySampling = undefined;
    // Keep pending API writes if this instance is readded before they are applied.
    this.prerenderSession?.destroy();
    if (this.captureListener) {
      this.metas.removeCaptureListener?.(this.captureListener);
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
