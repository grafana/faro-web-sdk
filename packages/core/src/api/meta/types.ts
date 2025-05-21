import type { MetaOverrides, MetaPage, MetaSession, MetaUser, MetaView } from '../../metas';

type OverridesAvailableThroughApi = Pick<MetaOverrides, 'serviceName'>;

export interface MetaAPI {
  setUser: (user?: MetaUser | undefined) => void;
  resetUser: () => void;
  setSession: (
    session?: MetaSession | undefined,
    options?: {
      overrides: OverridesAvailableThroughApi;
    }
  ) => void;
  resetSession: () => void;
  getSession: () => MetaSession | undefined;
  setView: (
    view?: MetaView | undefined,
    options?: {
      overrides: OverridesAvailableThroughApi;
    }
  ) => void;
  getView: () => MetaView | undefined;
  /**
   * If a string is provided, it will be used as the page id.
   */
  setPage: (page?: MetaPage | string | undefined) => void;
  getPage: () => MetaPage | undefined;
}
