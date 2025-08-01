import { faro, VERSION } from '@grafana/faro-core';
import type { Meta, MetaItem } from '@grafana/faro-core';

export const sdkMeta: MetaItem<Pick<Meta, 'sdk'>> = () => ({
  sdk: {
    name: '@grafana/faro-core',
    version: VERSION,
    integrations: faro.config.instrumentations.map(({ name, version }) => ({ name, version })),
  },
});
