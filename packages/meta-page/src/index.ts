import type { Meta } from '@grafana/javascript-agent-core';

const pageMeta: Meta = () => ({
  page: () => ({
    href: location.href,
  }),
});

export default pageMeta;
