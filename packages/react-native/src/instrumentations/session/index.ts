import { BaseInstrumentation, genShortID, VERSION } from '@grafana/faro-core';
import type { MetaSession } from '@grafana/faro-core';

/**
 * Session instrumentation for React Native
 * Creates a basic session for each app launch
 * TODO: Implement persistent session management with AsyncStorage
 */
export class SessionInstrumentation extends BaseInstrumentation {
  readonly name = '@grafana/faro-react-native:instrumentation-session';
  readonly version = VERSION;

  initialize(): void {
    this.unpatchedConsole.log('[Faro Session] Initializing session instrumentation');

    const sessionTrackingConfig = this.config.sessionTracking;

    if (!sessionTrackingConfig?.enabled) {
      this.unpatchedConsole.warn('[Faro Session] Session tracking is disabled');
      this.logInfo('Session tracking is disabled');
      return;
    }

    // Create a simple session with a generated ID
    const sessionId = sessionTrackingConfig.session?.id ?? genShortID();

    const session: MetaSession = {
      id: sessionId,
      attributes: {
        ...sessionTrackingConfig.session?.attributes,
      },
    };

    this.unpatchedConsole.log('[Faro Session] Created session with ID:', sessionId);

    // Set the session in the API so it gets added to meta
    this.api.setSession(session);

    this.unpatchedConsole.log('[Faro Session] Session instrumentation initialized');
    this.logInfo('Session instrumentation initialized');
  }
}
