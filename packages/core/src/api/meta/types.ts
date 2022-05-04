import type { User } from '../../metas/types';

export interface MetaAPI {
  setUser: (user: User | null) => void;
}
