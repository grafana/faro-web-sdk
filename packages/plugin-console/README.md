# @grafana/javascript-agent-plugin-console

Grafana JavaScript Agent plugin for both, browsers and Node.js which provides an automatic mechanism for collecting
console events but also allows you to print all the events within the agent to the console.

Out of the box, all log levels except `log` and `debug` are captured, but they can be enabled by overriding the
`disabledInstrumentationLevels` array in the config. The transport is also disabled by default.

---

## Installation

```ts
import { initializeAgent, LogLevel } from '@grafana/javascript-agent-core';
import getConsolePlugin from '@grafana/javascript-agent-plugin-console';

const agent = initializeAgent({
  plugins: [
    // Add the plugin to the plugins list while initializing the agent
    getConsolePlugin(),
  ],
});
```

---

## Options

The plugin supports an optional configuration parameter.

| Property                        | Description                                  | Type         | Default Value                    |
| ------------------------------- | -------------------------------------------- | ------------ | -------------------------------- |
| `disabledInstrumentationLevels` | An array of levels to ignore while capturing | `LogLevel[]` | `[LogLevel.LOG, LogLevel.DEBUG]` |
| `enableInstrumentation`         | Flag to enable or disable the capturing      | `boolean`    | `true`                           |
| `enableTransport`               | Flag to enable or disable the transport      | `boolean`    | `false`                          |
| `transportLevel`                | A level to use while printing the events     | `LogLevel`   | `LogLevel.DEBUG`                 |
