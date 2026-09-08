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
    setSession: (session) => transport.api?.setSession(session),
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

  logDebug('Session expired created new session.');
}
