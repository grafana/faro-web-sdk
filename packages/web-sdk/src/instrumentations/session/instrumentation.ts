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

interface SessionLifetime {
  manager?: InstanceType<SessionManager>;
  notifiedSession?: MetaSession;
  disposers: Array<() => void>;
}

export class SessionInstrumentation extends BaseInstrumentation {
  readonly name = '@grafana/faro-web-sdk:instrumentation-session';
  readonly version: string = VERSION;

  private lifetime?: SessionLifetime;

  private sendSessionStartEvent(meta: Meta, lifetime: SessionLifetime): void {
    if (this.lifetime !== lifetime) {
      return;
    }
    const session = meta.session;
    const previousSession = lifetime.notifiedSession;
    if (session && session.id !== previousSession?.id) {
      lifetime.notifiedSession = session;
      // Adopting another tab's session: track it but emit nothing (the creating tab already did).
      if (lifetime.manager?.isAdopting()) {
        return;
      }
      const event =
        previousSession?.id === session.attributes?.['previousSession'] && previousSession
          ? EVENT_SESSION_EXTEND
          : EVENT_SESSION_START;
      this.api.pushEvent(event, {}, undefined, { skipDedupe: true });
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

  private registerBeforeSendHook(lifetime: SessionLifetime): void {
    const transports = this.transports;
    const beforeSendHook: BeforeSendHook = (item) => {
      if (this.lifetime !== lifetime) {
        return item;
      }
      // config.beforeSend runs before this hook. Sampling and hooks added later
      // retain their existing order and do not undo session activity.
      const sessionId = item.meta.session?.id;
      if (sessionId && !this.transports.isPaused()) {
        lifetime.manager?.recordActivity(sessionId);
      }
      if (this.lifetime !== lifetime) {
        return item;
      }
      // Delivery filters using the captured session's sampling decision. It must
      // never rotate or reassign an item that already belongs to a session.
      const attributes = item.meta.session?.attributes;

      if (attributes && attributes?.['isSampled'] === 'true') {
        let newItem: TransportItem = JSON.parse(JSON.stringify(item));
        if (this.lifetime !== lifetime) {
          return item;
        }

        const newAttributes = newItem.meta.session?.attributes;
        delete newAttributes?.['isSampled'];

        if (Object.keys(newAttributes ?? {}).length === 0) {
          delete newItem.meta.session?.attributes;
        }

        return newItem;
      }

      return null;
    };
    this.register(
      lifetime,
      () => transports.addBeforeSendHooks(beforeSendHook),
      () => transports.removeBeforeSendHooks(beforeSendHook)
    );
  }

  initialize(): void {
    this.destroy();
    if (this.lifetime) {
      return;
    }
    const lifetime: SessionLifetime = { disposers: [] };
    this.lifetime = lifetime;
    const isActive = () => this.lifetime === lifetime;
    const metas = this.metas;
    const sessionTrackingConfig = this.config.sessionTracking;
    try {
      if (sessionTrackingConfig?.enabled) {
        const SessionManager = getSessionManagerByConfig(sessionTrackingConfig);
        lifetime.manager = new SessionManager();
        if (!isActive()) {
          lifetime.manager.dispose();
          return;
        }
        this.registerBeforeSendHook(lifetime);

        const endPreparation = this.metas.beginSessionUpdate?.();
        let lifecycleType: LifecycleType;
        try {
          const initial = this.createInitialSession(SessionManager, sessionTrackingConfig);
          if (!isActive()) {
            return;
          }
          lifecycleType = initial.lifecycleType;
          lifetime.manager.storeSession(initial.initialSession);
          if (!isActive()) {
            return;
          }
          lifetime.notifiedSession = initial.initialSession.sessionMeta;
          this.api.setSession(initial.initialSession.sessionMeta);
        } finally {
          endPreparation?.();
        }
        if (!isActive()) {
          return;
        }
        const captureListener = () => {
          if (isActive() && !this.transports.isPaused()) {
            lifetime.manager!.updateSession({ refreshActivity: false });
          }
        };
        this.register(
          lifetime,
          () => metas.addCaptureListener?.(captureListener),
          () => metas.removeCaptureListener?.(captureListener)
        );

        if (isActive()) {
          this.api.pushEvent(lifecycleType, {}, undefined, { skipDedupe: true });
        }
      }
      if (isActive()) {
        const sessionStartListener = (meta: Meta) => this.sendSessionStartEvent(meta, lifetime);
        this.register(
          lifetime,
          () => metas.addListener(sessionStartListener),
          () => metas.removeListener(sessionStartListener)
        );
      }
    } catch (error) {
      if (isActive()) {
        this.destroy();
      }
      throw error;
    }
  }

  private register(lifetime: SessionLifetime, add: () => void, remove: () => void): void {
    if (this.lifetime !== lifetime) {
      return;
    }
    lifetime.disposers.push(remove);
    add();
    if (this.lifetime !== lifetime) {
      remove();
    }
  }

  destroy(): void {
    const lifetime = this.lifetime;
    if (!lifetime) {
      return;
    }
    this.lifetime = undefined;
    const disposers = [() => lifetime.manager?.dispose(), ...lifetime.disposers];
    for (const dispose of disposers) {
      try {
        dispose();
      } catch (error) {
        this.logWarn('Failed to dispose session instrumentation resource', error);
      }
    }
  }
}
