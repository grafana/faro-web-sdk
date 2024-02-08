import type { Faro } from '../sdk';
import { VERSION } from '../version';

import type { Meta } from './types';

export function registerInitialMetas(faro: Faro): void {
  const initial: Meta = {
    sdk: {
      version: VERSION,
    },
    app: {
      bundleId: faro.config.app.name ? faro.api.getBuildId(faro.config.app.name) : undefined,
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
