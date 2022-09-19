import type { MetaSession, MetaUser } from '../../metas';

export interface MetaAPI {
  setUser: (user: MetaUser) => void;
  resetUser: () => void;
  setSession: (session: MetaSession) => void;
  resetSession: () => void;
  getSession: () => MetaSession | undefined;
}
