# @grafana/javascript-agent-instrumentation-errors

Grafana JavaScript Agent browser package which provides an automatic mechanism for collecting unhandled exceptions and errors.

## Installation

```ts
import { initializeAgent } from '@grafana/javascript-agent-core';
import errorsInstrumentation from '@grafana/javascript-agent-instrumentation-errors';

const agent = initializeAgent({
  instrumentations: [
    // Add the package to the instrumentations list when initializing the agent
    errorsInstrumentation,
  ],
});
```
