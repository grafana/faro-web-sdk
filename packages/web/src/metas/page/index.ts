import type { Meta } from '@grafana/agent-core';

export const pageMeta: Meta = () => ({
  page: () => ({
    url: location.href,
  }),
});
