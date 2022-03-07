import type { Meta } from '@grafana/javascript-agent-core';

const pageMeta: Meta = () => ({
  page: () => ({
    url: location.href,
  }),
});

export default pageMeta;
