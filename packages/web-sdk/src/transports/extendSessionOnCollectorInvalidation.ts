import type { API, BaseExtension, Config, Metas } from '@grafana/faro-core';

import { getSessionManagerByConfig } from '../instrumentations/session/sessionManager';
import {
  getUserSessionUpdater,
  type UserSessionUpdaterContext,
} from '../instrumentations/session/sessionManager/sessionManagerUtils';

const updaterByMetas = new WeakMap<Metas, ReturnType<typeof getUserSessionUpdater>>();

export function getCollectorInvalidationContext(
  transport: Pick<BaseExtension, 'config' | 'metas'> & { api?: API }
): UserSessionUpdaterContext {
  return {
    getInMemorySessionId: () => transport.metas.value.session?.id,
    getSessionTrackingConfig: () => transport.config.sessionTracking,
    getSessionAttributes: () => transport.metas.value.session?.attributes,
    getSessionOverrides: () => transport.metas.value.session?.overrides,
    getMetas: () => transport.metas.value,
    metas: transport.metas,
    ...(transport.api ? { setSession: (session) => transport.api!.setSession(session) } : {}),
    onSessionChange: transport.config.sessionTracking?.onSessionChange,
  };
}

export function extendSessionOnCollectorInvalidation(
  config: Config,
  invalidatedSessionId: string | undefined,
  transport: Pick<BaseExtension, 'config' | 'metas'> & { api?: API },
  logDebug: BaseExtension['logDebug']
): void {
  const sessionTrackingConfig = transport.config.sessionTracking ?? config.sessionTracking;

  if (!sessionTrackingConfig?.enabled) {
    logDebug('Session expired.');
    return;
  }

  const { fetchUserSession, storeUserSession } = getSessionManagerByConfig(sessionTrackingConfig);
  const context = getCollectorInvalidationContext(transport);

  // A delayed response must not rotate a newer session, including one another
  // tab has already established in shared storage.
  const currentSessionId = context.getInMemorySessionId?.();
  const storedSessionId = fetchUserSession()?.sessionId;
  if (!invalidatedSessionId || invalidatedSessionId !== currentSessionId || invalidatedSessionId !== storedSessionId) {
    logDebug('Ignoring stale or cross-tab session-invalid response; request session no longer current.');
    return;
  }

  let updater = updaterByMetas.get(transport.metas);
  if (updater == null) {
    updater = getUserSessionUpdater({
      fetchUserSession,
      storeUserSession,
      context,
    });
    updaterByMetas.set(transport.metas, updater);
  }

  updater({ forceSessionExtend: true, invalidatedSessionId });

  logDebug('Session expired; created new session.');
}
