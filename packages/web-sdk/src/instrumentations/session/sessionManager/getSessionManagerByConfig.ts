import type { Config } from '@grafana/faro-core';

import { PersistentSessionsManager } from './PersistentSessionsManager';
import type { SessionManager } from './types';
import { VolatileSessionsManager } from './VolatileSessionManager';

export function getSessionManagerByConfig(sessionTrackingConfig: Config['sessionTracking']): SessionManager {
  return sessionTrackingConfig?.persistent ? PersistentSessionsManager : VolatileSessionsManager;
}
