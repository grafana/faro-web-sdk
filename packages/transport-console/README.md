# @grafana/javascript-agent-transport-console

Grafana JavaScript Agent package for both, browsers and Node.js, which shows the collected data in the console.

## Installation

```ts
import { initializeAgent, LogLevel } from '@grafana/javascript-agent-core';
import getConsoleTransport from '@grafana/javascript-agent-transport-console';

const agent = initializeAgent({
  transports: [
    // Add the package to the transports list when initializing the agent
    getConsoleTransport(),
  ],
});
```

## Options

The packges supports an optional configuration parameter.

| Property | Description                             | Type       | Default Value    |
| -------- | --------------------------------------- | ---------- | ---------------- |
| `level`  | A level to use when printing the events | `LogLevel` | `LogLevel.DEBUG` |
