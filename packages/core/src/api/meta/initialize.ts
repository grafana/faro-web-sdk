import type { Meta, Metas, User } from '../../metas';
import type { Transports } from '../../transports';
import type { MetaAPI } from './types';

export function initializeMetaAPI(_: Transports, metas: Metas): MetaAPI {
  let meta: Meta = {};

  metas.add(() => meta);

  const setUser = (user: User | null) => {
    meta = { ...meta, user: user ?? undefined };
  };

  return {
    setUser,
  };
}
