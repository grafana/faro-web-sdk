import type { User } from '../../metas';

export interface MetaAPI {
  setUser: (user: User | null) => void;
}
