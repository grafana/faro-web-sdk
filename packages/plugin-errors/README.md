# @grafana/javascript-agent-plugin-errors

Grafana JavaScript Agent plugin for both, browsers and Node.js, which provides an automatic mechanism for collecting
unhandled exceptions and errors.

---

## Installation

```ts
import { initializeAgent } from '@grafana/javascript-agent-core';
import errorsPlugin from '@grafana/javascript-agent-plugin-errors';

const agent = initializeAgent({
  plugins: [
    // Add the plugin to the plugins list while initializing the agent
    errorsPlugin,
  ],
});
```
