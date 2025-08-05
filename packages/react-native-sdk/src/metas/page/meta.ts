import type { Meta, MetaItem } from '@grafana/faro-core';

export const pageMeta: MetaItem<Pick<Meta, 'page'>> = () => ({
  page: {
    url: location.href,
  },
});
