import type { InternalLogger } from '../../internalLogger';
import type { Meta, Metas, MetaUser } from '../../metas';
import type { Transports } from '../../transports';
import type { MetaAPI } from './types';

export function initializeMetaAPI(_internalLogger: InternalLogger, _transports: Transports, metas: Metas): MetaAPI {
  let meta: Meta = {};

  metas.add(() => meta);

  const setUser: MetaAPI['setUser'] = (user: MetaUser | null) => {
    meta = { ...meta, user: user ?? undefined };
  };

  return {
    setUser,
  };
}
