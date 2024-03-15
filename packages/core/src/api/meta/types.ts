import type { MetaSession, MetaUser, MetaView } from '../../metas';

export interface MetaAPI {
  setUser: (user?: MetaUser | undefined) => void;
  resetUser: () => void;
  setSession: (session?: MetaSession | undefined) => void;
  resetSession: () => void;
  getSession: () => MetaSession | undefined;
  setView: (view?: MetaView | undefined) => void;
  getView: () => MetaView | undefined;
}
