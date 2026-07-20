import type { API, Config, Metas, MetaSession } from '@grafana/faro-core';

export interface FaroUserSession {
  sessionId: string;
  lastActivity: number;
  started: number;
  isSampled: boolean;
  sessionMeta?: MetaSession;
}

export interface SessionManagerDeps {
  config: Config;
  metas: Metas;
  api: API;
}

export interface SessionManagerInstance {
  isAdopting: () => boolean;
  updateSession: () => void;
  fetchUserSession: () => FaroUserSession | null;
  storeUserSession: (session: FaroUserSession) => void;
  removeUserSession: () => void;
}

export type SessionManagerClass = new (namespace?: string, deps?: SessionManagerDeps) => SessionManagerInstance;
