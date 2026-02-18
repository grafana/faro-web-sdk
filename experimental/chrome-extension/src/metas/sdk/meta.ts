import { VERSION } from '@grafana/faro-core';
import type { Meta, MetaItem } from '@grafana/faro-core';

export const sdkMeta: MetaItem<Pick<Meta, 'sdk'>> = () => ({
  sdk: {
    name: 'faro-chrome-extension',
    version: VERSION,
  },
});
