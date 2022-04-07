import type { Meta, Metas } from '../../metas';
import type { User } from '../../metas/types';
import type { Transports } from '../../transports';
import type { MetaAPI } from './types';

export function initializeMeta(_: Transports, metas: Metas): MetaAPI {
  let meta: Meta = {};

  metas.add(() => meta);

  return {
    setUser: (user: User | null) => {
      meta = { user: user ?? undefined };
    },
  };
}
