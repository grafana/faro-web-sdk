# @grafana/agent-core

Core package of Grafana JavaScript Agent.

The entire architecture of the library is contained within this package. Out of the box, it doesn't collect any metrics,
logs etc. but it offers an API to capture them.

## Installation

```ts
import { initializeAgent } from '@grafana/agent-core';

initializeAgent({
  // ...
});
```

## Options

The agent requires a configuration parameter.

| Property                | Description                                                             | Type                | Optional | Default Value  |
| ----------------------- | ----------------------------------------------------------------------- | ------------------- | -------- | -------------- |
| `app`                   | Application metadata                                                    | `App`               | Y        | `undefined`    |
| `globalObjectKey`       | String that should be used when defining the agent on the global object | `string`            | Y        | `grafanaAgent` |
| `instrumentations`      | Array of instrumentations that should be ran                            | `Instrumentation[]` | N        | `[]`           |
| `metas`                 | Array of metas that should be logged                                    | `MetaItem[]`        | Y        | `[]`           |
| `preventGlobalExposure` | Flag for toggling the definition on the global object                   | `boolean`           | Y        | `false`        |
| `session`               | Session metadata                                                        | `Session`           | Y        | `undefined`    |
| `transports`            | Array of transports that should be used                                 | `Transport[]`       | Y        | `[]`           |
| `user`                  | User metadata                                                           | `User`              | Y        | `undefined`    |

## Components

### Agent

The agent is an object which can be accessed by either importing it from the package or by referencing it from the
global object (`window` in browsers and `global` in Node.js).

```ts
// Browser/Node.js
import { agent } from '@grafana/agent-core';

agent.api.pushLog(/* ... */);

// Browser
window.grafanaJavaScriptAgent.api.pushLog(/* ... */);

// Node.js
global.grafanaJavaScriptAgent.api.pushLog(/* ... */);
```

#### API

The `api` property on the agent contains all the necessary methods to push new events.

##### Exceptions

- `pushException` - is a method to push an error/exception to the agent. It accepts a message as a mandatory parameter
  and two optional ones: a `type` which by default is `error` and `stackFrames` which is an array of stack frames.

  ```ts
  agent.api.pushException('This is an error');
  agent.api.pushException('This is an unhandled exception', 'unhandledException');
  agent.api.pushException('This is an error with stack frames', 'error', [
    {
      filename: 'file.js',
      function: 'myFunction',
      colno: 120,
      lineno: 80,
    },
  ]);
  ```

##### Logs

- `callOriginalConsoleMethod` - is a method to call the original console methods. Some instrumentations might override
  the default console methods, so this helper makes sure that you call the original methods. It accepts a `level`
  parameter and the rest of the parameters are inherited from the original method.

  ```ts
  agent.api.callOriginalConsoleMethod(LogLevel.LOG, 'This is a log');
  agent.api.callOriginalConsoleMethod(LogLevel.WARN, 'This is a warning');
  ```

- `pushLog` - is a method to register a log event. The method accepts a mandatory `args` parameter which is an array of
  arguments that will be stringified and send to the transports. The other two parameters are optional: `logLevel` is
  the type of message that we register and `context` is a plain object containing primitive values that will be
  recorded along with the message.

  ```ts
  agent.api.pushLog(['This is a log', 'With another message']);
  agent.api.pushLog(['This is a warning'], LogLevel.WARN);
  agent.api.pushLog(['This is a log with context'], LogLevel.LOG, {
    randomNumber: Math.random(),
  });
  ```

##### Measurements

- `pushMeasurement` - is a method for registering metrics.

  ```ts
  agent.api.pushMeasurement({
    type: 'custom',
    values: {
      my_custom_metric: Math.random(),
    },
  });
  ```

##### Traces

- `pushSpan` - TODO

#### Instrumentations

Instrumentations are packages that leverage the agent API to provide automatic mechanisms for collecting data. They are
just simple functions that are executed when the agent is initialized.

Please note that the `core` package does not contain any instrumentations out of the box and they should be provided by
external packages like [@grafana/agent-instrumentation-console](https://github.com/grafana/grafana-javascript-agent/tree/main/packages/instrumentation-console),
[@grafana/agent-instrumentation-errors](https://github.com/grafana/grafana-javascript-agent/tree/main/packages/instrumentation-errors),
[@grafana/agent-instrumentation-tracing](https://github.com/grafana/grafana-javascript-agent/tree/main/packages/instrumentation-tracing)
and [@grafana/agent-instrumentation-web-vitals](https://github.com/grafana/grafana-javascript-agent/tree/main/packages/instrumentation-web-vitals).

You can also write your own instrumentations:

```ts
import { agent, initializeAgent } from '@grafana/agent-core';

initializeAgent({
  instrumentations: [
    () => {
      const myLog = 'asdf';

      agent.api.pushLog([myLog]);
    },
  ],
});
```

#### Metas

Metas are objects that will be attached to every event that is triggered by the API.

Out of the box, only one meta is provided: `sdk` which contains information about the agent and its version. Additional
metas can be provided by external packages like [@grafana/agent-meta-browser](https://github.com/grafana/grafana-javascript-agent/tree/main/packages/meta-browser)
and [@grafana/agent-meta-page](https://github.com/grafana/grafana-javascript-agent/tree/main/packages/meta-page).

You can also define your own metas:

```ts
import { agent, initializeAgent } from '@grafana/agent-core';

initializeAgent({
  metas: [
    // Define a static meta
    {
      app: {
        name: 'my-app',
        version: '1.0.0',
      },
    },

    // Define a meta which caches some values on initialization
    () => {
      return {
        user: {
          username: getUser().name,
        },
      };
    },
  ],
});
```

#### Transports

Transports are functions that will be called for every event that is triggered by the API. They are used to do
something with the data after collecting it.

Out of the box, no transports are provided in the `core` package and they should be provided by external packages like
[@grafana/agent-transport-console](https://github.com/grafana/grafana-javascript-agent/tree/main/packages/transport-console)
and [@grafana/agent-transport-fetch](https://github.com/grafana/grafana-javascript-agent/tree/main/packages/transport-fetch).

You can also define your own transports:

```ts
import { agent, initializeAgent } from '@grafana/agent-core';

initializeAgent({
  transports: [
    (item) => {
      // Do something with the data
      console.log(item);
    },
  ],
});
```
