import type { MetaUser } from '../../metas';

export interface MetaAPI {
  setUser: (user: MetaUser | null) => void;
}
