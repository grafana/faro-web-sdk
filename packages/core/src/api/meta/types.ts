import type { MetaOverrides, MetaSession, MetaUser, MetaView } from '../../metas';

export interface MetaAPI {
  setUser: (user?: MetaUser | undefined) => void;
  resetUser: () => void;
  setSession: (
    session?: MetaSession | undefined,
    options?: {
      overrides: MetaOverrides;
    }
  ) => void;
  resetSession: () => void;
  getSession: () => MetaSession | undefined;
  setView: (
    view?: MetaView | undefined,
    options?: {
      overrides: MetaOverrides;
    }
  ) => void;
  getView: () => MetaView | undefined;
}
