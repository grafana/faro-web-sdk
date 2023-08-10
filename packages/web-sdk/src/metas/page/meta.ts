import { globalObject, type Meta, type MetaItem } from '@grafana/faro-core';

export const pageMeta: MetaItem<Pick<Meta, 'page'>> = () => ({
  page: {
    url: globalObject?.location?.href ?? 'unknown',
  },
});
