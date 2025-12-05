import {
  BaseInstrumentation,
  dateNow,
  EVENT_SESSION_EXTEND,
  EVENT_SESSION_RESUME,
  EVENT_SESSION_START,
  genShortID,
  VERSION,
} from '@grafana/faro-core';
import type { Config, Meta, MetaSession } from '@grafana/faro-core';

import type { TransportItem } from '../../transports/fetch/types';

import { getSessionAttributes } from './sessionAttributes';
import { type FaroUserSession, getSessionManagerByConfig, isSampled } from './sessionManager';
import { PersistentSessionsManager } from './sessionManager/PersistentSessionsManager';
import { createUserSessionObject, isUserSessionValid } from './sessionManager/sessionManagerUtils';
import type { SessionManager } from './sessionManager/types';

type LifecycleType = typeof EVENT_SESSION_RESUME | typeof EVENT_SESSION_START;

/**
 * Session instrumentation for React Native
 * Manages persistent or volatile sessions with expiration and inactivity tracking
 */
export class SessionInstrumentation extends BaseInstrumentation {
  readonly name = '@grafana/faro-react-native:instrumentation-session';
  readonly version = VERSION;

  // previously notified session, to ensure we don't send session start
  // event twice for the same session
  private notifiedSession: MetaSession | undefined;
  private sessionManagerInstance: InstanceType<SessionManager> | undefined;

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

  private async createInitialSession(
    SessionManager: SessionManager,
    sessionsConfig: Required<Config>['sessionTracking']
  ): Promise<{
    initialSession: FaroUserSession;
    lifecycleType: LifecycleType;
  }> {
    let storedUserSession: FaroUserSession | null = await SessionManager.fetchUserSession();

    if (sessionsConfig.persistent && sessionsConfig.maxSessionPersistenceTime && storedUserSession) {
      const now = dateNow();
      const shouldClearPersistentSession =
        storedUserSession.lastActivity < now - sessionsConfig.maxSessionPersistenceTime;

      if (shouldClearPersistentSession) {
        await PersistentSessionsManager.removeUserSession();
        storedUserSession = null;
      }
    }

    // Get default session attributes (device info, SDK version, etc.)
    // These match the Flutter SDK's default session attributes
    const defaultAttributes = await getSessionAttributes();

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
          // Start with custom attributes from config
          ...sessionsConfig.session?.attributes,
          // Merge with stored attributes
          ...storedUserSessionMeta?.attributes,
          // Default attributes take precedence (matching Flutter SDK behavior)
          ...defaultAttributes,
          // For valid resumed sessions we do not want to recalculate the sampling decision on each init phase.
          isSampled: initialSession.isSampled.toString(),
        },
        overrides,
      };

      lifecycleType = EVENT_SESSION_RESUME;
    } else {
      const sessionId = sessionsConfig.session?.id ?? genShortID();

      initialSession = createUserSessionObject({
        sessionId,
        isSampled: isSampled(),
      });

      const overrides = sessionsConfig.session?.overrides;

      initialSession.sessionMeta = {
        id: sessionId,
        attributes: {
          isSampled: initialSession.isSampled.toString(),
          // Start with custom attributes from config
          ...sessionsConfig.session?.attributes,
          // Default attributes take precedence (matching Flutter SDK behavior)
          ...defaultAttributes,
        },
        // new session we don't care about previous overrides
        ...(overrides ? { overrides } : {}),
      };

      lifecycleType = EVENT_SESSION_START;
    }

    return { initialSession, lifecycleType };
  }

  private registerBeforeSendHook(SessionManager: SessionManager) {
    const { updateSession } = new SessionManager();

    this.transports?.addBeforeSendHooks((item: TransportItem) => {
      updateSession();

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
    });
  }

  async initialize(): Promise<void> {
    this.logDebug('init session instrumentation');

    const sessionTrackingConfig = this.config.sessionTracking;

    if (sessionTrackingConfig?.enabled) {
      const SessionManager = getSessionManagerByConfig(sessionTrackingConfig);

      this.registerBeforeSendHook(SessionManager);

      const { initialSession, lifecycleType } = await this.createInitialSession(SessionManager, sessionTrackingConfig);

      await SessionManager.storeUserSession(initialSession);

      const initialSessionMeta = initialSession.sessionMeta;

      this.notifiedSession = initialSessionMeta;
      this.api.setSession(initialSessionMeta);

      // Store the session manager instance for cleanup
      this.sessionManagerInstance = new SessionManager();

      if (lifecycleType === EVENT_SESSION_START) {
        this.api.pushEvent(EVENT_SESSION_START, {}, undefined, { skipDedupe: true });
      }

      if (lifecycleType === EVENT_SESSION_RESUME) {
        this.api.pushEvent(EVENT_SESSION_RESUME, {}, undefined, { skipDedupe: true });
      }
    }

    this.metas.addListener(this.sendSessionStartEvent.bind(this));
  }

  /**
   * Clean up session manager listeners
   */
  unpatch(): void {
    if (this.sessionManagerInstance && 'unpatch' in this.sessionManagerInstance) {
      this.sessionManagerInstance.unpatch();
    }
  }
}
