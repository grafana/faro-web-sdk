# @grafana/javascript-agent-instrumentation-console

Grafana JavaScript Agent package for both, browsers and Node.js which provides an automatic mechanism for collecting
console events.

Out of the box, all log levels except `log` and `debug` are captured, but they can be enabled by overriding the
`disabledLevels` array in the config.

## Installation

```ts
import { initializeAgent, LogLevel } from '@grafana/javascript-agent-core';
import getConsoleInstrumentation from '@grafana/javascript-agent-instrumentation-console';

const agent = initializeAgent({
  instrumentations: [
    // Add the package to the instrumentations list when initializing the agent
    getConsoleInstrumentation(),
  ],
});
```

## Options

The package supports an optional configuration parameter.

| Property         | Description                                  | Type         | Optional | Default Value                    |
| ---------------- | -------------------------------------------- | ------------ | -------- | -------------------------------- |
| `disabledLevels` | An array of levels to ignore while capturing | `LogLevel[]` | Y        | `[LogLevel.LOG, LogLevel.DEBUG]` |
