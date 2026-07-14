import type { Config } from '@grafana/faro-core';

import { PersistentSessionsManager } from './PersistentSessionsManager';
import type { SessionManagerClass } from './types';
import { VolatileSessionsManager } from './VolatileSessionManager';

export function getSessionManagerByConfig(sessionTrackingConfig: Config['sessionTracking']): SessionManagerClass {
  return sessionTrackingConfig?.persistent ? PersistentSessionsManager : VolatileSessionsManager;
}
