import { Faro, Meta, MetaItem, VERSION } from '@grafana/faro-core';

export function registerMetas(faro: Faro): MetaItem[] {
  const initial: Meta = {
    sdk: {
      name: '@grafana/faro-instrumentation-react-native',
      version: VERSION,
      integrations: faro?.config?.instrumentations?.map(({ name, version }) => ({ name, version })),
    },
  };

  if (faro?.config?.session) {
    faro.api.setSession(faro.config.session);
  }

  if (faro?.config?.app) {
    initial.app = faro.config.app;
  }

  if (faro?.config?.user) {
    initial.user = faro.config.user;
  }

  if (faro?.config?.view) {
    initial.view = faro.config.view;
  }

  faro?.metas?.add(initial, ...(faro.config.metas ?? []));

  return [initial];
}
