import type { Config } from '../../config';
import type { InternalLogger } from '../../internalLogger';
import type { Meta, Metas } from '../../metas';
import type { Transports } from '../../transports';
import type { UnpatchedConsole } from '../../unpatchedConsole';
import { deepEqual } from '../../utils/deepEqual';

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
  let metaView: Partial<Meta> | undefined = undefined;

  const setUser: MetaAPI['setUser'] = (user) => {
    if (metaUser) {
      metas.remove(metaUser);
    }

    metaUser = {
      user,
    };

    metas.add(metaUser);
  };

  const setSession: MetaAPI['setSession'] = (session, options) => {
    const overrides = options?.overrides;

    if (deepEqual(metaSession?.session, session) && deepEqual(metaSession?.session?.overrides, overrides)) {
      return;
    }

    const previousSession = metaSession;

    metaSession = {
      session,
    };

    metas.add(metaSession);

    if (previousSession) {
      metas.remove(previousSession);
    }
  };

  const getSession: MetaAPI['getSession'] = () => metas.value.session;

  const setView: MetaAPI['setView'] = (view, options) => {
    if (options?.overrides) {
      setSession({ overrides: options.overrides });
    }

    if (metaView?.view?.name === view?.name) {
      return;
    }

    const previousView = metaView;

    metaView = {
      view,
    };

    metas.add(metaView);

    if (previousView) {
      metas.remove(previousView);
    }
  };

  const getView: MetaAPI['getView'] = () => metas.value.view;

  return {
    setUser,
    resetUser: setUser as MetaAPI['resetUser'],
    setSession,
    resetSession: setSession as MetaAPI['resetSession'],
    getSession,
    setView,
    getView,
  };
}
