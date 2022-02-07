# @grafana/javascript-agent-meta-page

Grafana JavaScript Agent browser package for collecting details about the current page (i.e. the URL, page title etc.).

This should be used in combination with other packages to provide data about the environment where an error occurred or
a console event happened.

## Installation

```ts
import { initializeAgent } from '@grafana/javascript-agent-core';
import pageMeta from '@grafana/javascript-agent-meta-page';

const agent = initializeAgent({
  metas: [
    // Add the package to the metas list when initializing the agent
    pageMeta,
  ],
});
```
