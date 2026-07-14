import type { MetaSession } from '@grafana/faro-core';

export interface FaroUserSession {
  sessionId: string;
  lastActivity: number;
  started: number;
  isSampled: boolean;
  sessionMeta?: MetaSession;
}

export interface SessionManagerInstance {
  isAdopting: () => boolean;
  updateSession: () => void;
  fetchUserSession: () => FaroUserSession | null;
  storeUserSession: (session: FaroUserSession) => void;
  removeUserSession: () => void;
}

export type SessionManagerClass = new (namespace: string | undefined) => SessionManagerInstance;
