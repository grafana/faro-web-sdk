import type { Meta, MetaItem } from '@grafana/faro-core';

export const pageMeta: MetaItem<Pick<Meta, 'page'>> = () => ({
  page: {
    id: location.pathname,
    url: location.href,
  },
});
