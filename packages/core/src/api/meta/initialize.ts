import type { Config } from '../../config';
import type { InternalLogger } from '../../internalLogger';
import type { Meta, Metas, MetaSession, MetaUser } from '../../metas';
import type { Transports } from '../../transports';
import type { UnpatchedConsole } from '../../unpatchedConsole';
import type { MetaAPI } from './types';

export function initializeMetaAPI(
  _unpatchedConsole: UnpatchedConsole,
  internalLogger: InternalLogger,
  _config: Config,
  metas: Metas,
  _transports: Transports
): MetaAPI {
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
