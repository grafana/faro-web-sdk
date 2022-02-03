# @grafana/javascript-agent-plugin-page-meta

Grafana JavaScript Agent plugin for collecting details about the current page (i.e. the URL, page title etc.).

This should be used in combination with other plugins to provide data about the environment where an error occurred or
a console event happened.

---

## Installation

```ts
import { initializeAgent } from '@grafana/javascript-agent-core';
import pageMetaPlugin from '@grafana/javascript-agent-plugin-page-meta';

const agent = initializeAgent({
  plugins: [
    // Add the plugin to the plugins list while initializing the agent
    pageMetaPlugin,
  ],
});
```
