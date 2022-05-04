import type { MetaItem } from '@grafana/agent-core';

export const pageMeta: MetaItem = () => ({
  page: {
    url: location.href,
  },
});
