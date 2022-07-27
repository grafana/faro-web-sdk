import type { Meta, MetaItem } from '@grafana/agent-core';

export const pageMeta: MetaItem<Pick<Meta, 'page'>> = () => ({
  page: {
    url: location.href,
  },
});
