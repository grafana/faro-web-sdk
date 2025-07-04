import type { Config } from '../../config';
import type { InternalLogger } from '../../internalLogger';
import type { Meta, Metas } from '../../metas';
import type { Transports } from '../../transports';
import type { UnpatchedConsole } from '../../unpatchedConsole';
import { isEmpty, isString } from '../../utils/is';
import type { TracesAPI } from '../traces';

import type { MetaAPI } from './types';

export function initializeMetaAPI({
  internalLogger,
  metas,
}: {
  unpatchedConsole: UnpatchedConsole;
  internalLogger: InternalLogger;
  config: Config;
  metas: Metas;
  transports: Transports;
  tracesApi: TracesAPI;
}): MetaAPI {
  internalLogger.debug('Initializing meta API');

  let metaSession: Partial<Meta> | undefined = undefined;
  let metaUser: Partial<Meta> | undefined = undefined;
  let metaView: Partial<Meta> | undefined = undefined;
  let metaPage: Partial<Meta> | undefined = undefined;

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
    const newOverrides = options?.overrides;
    const overrides = newOverrides
      ? {
          overrides: {
            ...metaSession?.session?.overrides,
            ...newOverrides,
          },
        }
      : {};

    if (metaSession) {
      metas.remove(metaSession);
    }

    metaSession = {
      session: {
        // if session is undefined, session manager force creates a new session
        ...(isEmpty(session) ? undefined : session),
        ...overrides,
      },
    };

    metas.add(metaSession);
  };

  const getSession: MetaAPI['getSession'] = () => metas.value.session;

  const setView: MetaAPI['setView'] = (view, options) => {
    if (options?.overrides) {
      setSession(getSession(), { overrides: options.overrides });
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

  const setPage: MetaAPI['setPage'] = (page) => {
    const pageMeta = isString(page)
      ? {
          // metaPage is available once setPage() has been called.
          // This is because page self updating metas like page need to be added as a function
          // Thus we call getPage in case metaPage is empty
          ...(metaPage?.page ?? getPage()),
          id: page,
        }
      : page;

    if (metaPage) {
      metas.remove(metaPage);
    }

    metaPage = {
      page: pageMeta,
    };

    metas.add(metaPage);
  };

  const getPage: MetaAPI['getPage'] = () => metas.value.page;

  return {
    setUser,
    resetUser: setUser as MetaAPI['resetUser'],
    setSession,
    resetSession: setSession as MetaAPI['resetSession'],
    getSession,
    setView,
    getView,
    setPage,
    getPage,
  };
}
