import type { BaseExtension, Config } from '@grafana/faro-core';

import { getSessionManagerByConfig } from '../instrumentations/session/sessionManager';
import { getUserSessionUpdater } from '../instrumentations/session/sessionManager/sessionManagerUtils';

export function extendSessionOnCollectorInvalidation(
  config: Config,
  invalidatedSessionId: string | undefined,
  getCurrentSessionId: () => string | undefined,
  logDebug: BaseExtension['logDebug']
): void {
  const currentSessionId = getCurrentSessionId();

  if (invalidatedSessionId != null && currentSessionId !== invalidatedSessionId) {
    return;
  }

  const sessionTrackingConfig = config.sessionTracking;

  if (sessionTrackingConfig?.enabled) {
    const { fetchUserSession, storeUserSession } = getSessionManagerByConfig(sessionTrackingConfig);

    getUserSessionUpdater({ fetchUserSession, storeUserSession })({ forceSessionExtend: true });

    logDebug('Session expired created new session.');
  } else {
    logDebug('Session expired.');
  }
}
