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
    const sessionTrackingConfig = this.config.sessionTracking;

    if (!sessionTrackingConfig?.enabled) {
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

    // Set the session in the API so it gets added to meta
    this.api.setSession(session);

    this.logInfo('Session instrumentation initialized');
  }
}
