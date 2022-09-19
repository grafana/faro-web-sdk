import type { InternalLogger } from '../../internalLogger';
import type { Meta, Metas, MetaSession, MetaUser } from '../../metas';
import type { Transports } from '../../transports';
import type { MetaAPI } from './types';

export function initializeMetaAPI(internalLogger: InternalLogger, _transports: Transports, metas: Metas): MetaAPI {
  internalLogger.debug('Initializing meta API');

  let metaSession: Partial<Meta> | undefined = undefined;
  let metaUser: Partial<Meta> | undefined = undefined;

  const setUser = (user?: MetaUser) => {
    if (metaUser) {
      metas.remove(metaUser);
    }

    metaUser = {
      user,
    };

    metas.add(metaUser);
  };

  const setSession = (session?: MetaSession) => {
    if (metaSession) {
      metas.remove(metaSession);
    }
    metaSession = {
      session,
    };

    metas.add(metaSession);
  };

  const getSession: MetaAPI['getSession'] = () => metas.value.session;

  return {
    setUser,
    resetUser: setUser,
    setSession,
    resetSession: setSession,
    getSession,
  };
}
