import type { Faro, MetaSession } from '@grafana/faro-core';

import type { PersistentSessionsManager } from './PersistentSessionsManager';
import type { VolatileSessionsManager } from './VolatileSessionManager';

export interface FaroUserSession {
  sessionId: string;
  lastActivity: number;
  started: number;
  isSampled: boolean;
  sessionMeta?: MetaSession;
}

export type SessionManager = typeof VolatileSessionsManager | typeof PersistentSessionsManager;

/** Retain the owning SDK when initialization or session updates run later. */
export type SessionContext = Pick<Faro, 'config' | 'api' | 'metas'>;
