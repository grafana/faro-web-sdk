import type { MetaSession, MetaUser } from '../../metas';

export interface MetaAPI {
  setUser: (user?: MetaUser) => void;
  setSession: (session?: MetaSession) => void;
  getSession: () => MetaSession | undefined;
}
