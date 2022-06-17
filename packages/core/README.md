# @grafana/agent-core

Core package of Grafana JavaScript Agent.

_Warning_: currently pre-release and subject to frequent breaking changes. Use at your own risk.

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

| Property                | Description                                                                            | Type                | Optional | Default Value  |
| ----------------------- | -------------------------------------------------------------------------------------- | ------------------- | -------- | -------------- |
| `app`                   | Application metadata                                                                   | `App`               | Y        | `undefined`    |
| `beforeSend`            | Hook invoked before pushing event to transport. Can be used to modify or filter events | `BeforeSendHook`    | Y        | `undefined`    |
| `globalObjectKey`       | String that should be used when defining the agent on the global object                | `string`            | Y        | `grafanaAgent` |
| `ignoreErrors`          | Error message patterns for errors that should be ignored                               | `Patterns`          | Y        | `[]`           |
| `instrumentations`      | Array of instrumentations that should be ran                                           | `Instrumentation[]` | N        | `[]`           |
| `metas`                 | Array of metas that should be logged                                                   | `MetaItem[]`        | Y        | `[]`           |
| `preventGlobalExposure` | Flag for toggling the definition on the global object                                  | `boolean`           | Y        | `false`        |
| `session`               | Session metadata                                                                       | `Session`           | Y        | `undefined`    |
| `transports`            | Array of transports that should be used                                                | `Transport[]`       | Y        | `[]`           |
| `user`                  | User metadata                                                                          | `User`              | Y        | `undefined`    |

## Agent

The agent is an object which can be accessed by either importing it from the package or by referencing it from the
global object (`window` in browsers and `global` in Node.js).

```ts
// Browser/Node.js
import { agent } from '@grafana/agent-core';

agent.api.pushLog(/* ... */);

// Browser
window.grafanaAgent.api.pushLog(/* ... */);

// Node.js
global.grafanaAgent.api.pushLog(/* ... */);
```

## API

The `api` property on the agent contains all the necessary methods to push new events.

## Errors

- `pushError` - is a method to push an error/exception to the agent. It accepts a mandatory `message` parameter
  and an optional one where you can set:

  - `stackFrames` - an array of stack frames. Defaults to parsing `error.stack` if present.
  - `type` - the type of exception. Default value: `error.name` or `"error"`.

  ```ts
  agent.api.pushError(new Error('This is an error'));

  agent.api.pushError(new Error('This is an unhandled exception'), { type: 'unhandledException' });

  agent.api.pushError(new Error('This is an error with stack frames'), {
    stackFrames: [
      {
        filename: 'file.js',
        function: 'myFunction',
        colno: 120,
        lineno: 80,
      },
    ],
  });
  ```

## Logs

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

  agent.api.pushLog(['This is a warning'], { level: LogLevel.WARN });

  agent.api.pushLog(['This is a log with context'], {
    context: {
      randomNumber: Math.random(),
    },
  });
  ```

## Measurements

- `pushMeasurement` - is a method for registering metrics. The method accepts a mandatory `payload` parameter and an
  optional parameter for passing additional options:

  - `span` - the span where the exception has occurred. Default value: `undefined`.

  ```ts
  agent.api.pushMeasurement({
    type: 'custom',
    values: {
      my_custom_metric: Math.random(),
    },
  });

  agent.api.pushMeasurement(
    {
      type: 'custom',
      values: {
        my_custom_metric: Math.random(),
      },
    },
    {
      span: mySpan,
    }
  );
  ```

## Instrumentations

Instrumentations are packages that leverage the agent API to provide automatic mechanisms for collecting data. They are
just simple functions that are executed when the agent is initialized.

Please note that the `core` package does not contain any instrumentations out of the box and they should be provided by
platform specific packages like [@grafana/agent-web](https://github.com/grafana/grafana-javascript-agent/tree/main/packages/web)

You can also write your own instrumentations:

```ts
import { agent, initializeAgent, BaseInstrumentation } from '@grafana/agent-core';

export class MyInstrumentation extends BaseInstrumentation {
  readonly version = '1.0.0';
  readonly name = 'my-instrumentation';

  initialize(): void {
    this.agent.api.pushLog(['hello from my instrumentation']);
  }
}

initializeAgent({
  instrumentations: [new MyInstrumentation()],
});
```

## Metas

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

## Transports

Transports are functions that will be called for every event that is triggered by the API. They are used to do
something with the data after collecting it.

Out of the box, no transports are provided in the `core` package and they should be provided by platform specific
packages like [@grafana/agent-web](https://github.com/grafana/grafana-javascript-agent/tree/main/packages/web)

You can also define your own transports:

```ts
import { agent, initializeAgent, BaseTransport, TransportItem } from '@grafana/agent-core';

class MyTransport extends BaseTransport {
  send(item: TransportItem) {
    // do something with paylaod
  }
}

initializeAgent({
  transports: [new MyTransport()],
});
```

## Shutdown

It's possible to shut down the agent. Instrumentations will unpatch/unregsiter, events will no longer be sent to transports,
global variable will be removed.
Warning: when using `ErrorInstrumentation` or `ConsoleInstrumentation`, and if `console` or `window.onerror` were wrapped by
something else after the grafana javascript agent was initialized, this later callback will be lost as well when shutting down.

```ts
import { agent } from '@grafana/agent-core';
agent.shutdown()
```
