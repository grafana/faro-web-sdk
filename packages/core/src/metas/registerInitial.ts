import type { Faro } from '../sdk';
import { getBundleId } from '../utils/sourceMaps';
import { VERSION } from '../version';

import type { Meta } from './types';

export function registerInitialMetas(faro: Faro): void {
  const initial: Meta = {
    sdk: {
      version: VERSION,
    },
    app: {
      bundleId: faro.config.app.name && getBundleId(faro.config.app.name),
    },
  };

  const session = faro.config.sessionTracking?.session;
  if (session) {
    faro.api.setSession(session);
  }

  if (faro.config.app) {
    initial.app = { ...faro.config.app, ...initial.app };
  }

  if (faro.config.user) {
    initial.user = faro.config.user;
  }

  if (faro.config.view) {
    initial.view = faro.config.view;
  }

  faro.metas.add(initial, ...(faro.config.metas ?? []));
}
