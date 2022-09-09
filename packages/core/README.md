# @grafana/agent-core

Core package of Grafana JavaScript Agent.

_Warning_: currently pre-release and subject to frequent breaking changes. Use at your own risk.

The entire architecture of the library is contained within this package. Out of the box, it doesn't collect any metrics,
logs etc. but it offers an API to capture them.

## Installation

```ts
import { initializeGrafanaAgent } from '@grafana/agent-core';

initializeGrafanaAgent({
  // ...
});
```

## Options

The agent requires a configuration parameter with the following properties:

| Property                | Description                                                             | Type                  | Default Value Variable                                   |
| ----------------------- | ----------------------------------------------------------------------- | --------------------- | -------------------------------------------------------- |
| `app`                   | Application metadata                                                    | `App`                 |                                                          |
| `globalObjectKey`       | String that should be used when defining the agent on the global object | `string`              | `defaultGlobalObjectKey = 'grafanaAgent'`                |
| `instrumentations`      | Array of instrumentations that should be ran                            | `Instrumentation[]`   |                                                          |
| `internalLoggerLevel`   | The level of information printed to console for internal messages       | `InternalLoggerLevel` | `defaultInternalLoggerLevel = InternalLoggerLevel.ERROR` |
| `isolate`               | A flag that will create an isolated agent                               | `boolean`             |                                                          |
| `metas`                 | Array of metas that should be logged                                    | `MetaItem[]`          |                                                          |
| `parseStacktrace`       | A function used to parse stack traces                                   | `StacktraceParser`    |                                                          |
| `paused`                | Flag for initializing the agent as paused                               | `boolean`             |                                                          |
| `preventGlobalExposure` | Flag for toggling the definition on the global object                   | `boolean`             |                                                          |
| `transports`            | Array of transports that should be used                                 | `Transport[]`         |                                                          |

Besides the mandatory properties, the agent also supports the following optional properties:

| Property       | Description                                                                            | Type             | Default Value |
| -------------- | -------------------------------------------------------------------------------------- | ---------------- | ------------- |
| `beforeSend`   | Hook invoked before pushing event to transport. Can be used to modify or filter events | `BeforeSendHook` | `undefined`   |
| `eventDomain`  | event.domain attribute of an event, to be set on every event item as default           | `string`         | `undefined`   |
| `ignoreErrors` | Error message patterns for errors that should be ignored                               | `Patterns`       | `[]`          |
| `session`      | Session metadata                                                                       | `Session`        | `undefined`   |
| `user`         | User metadata                                                                          | `User`           | `undefined`   |

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
import { agent, initializeGrafanaAgent, BaseInstrumentation } from '@grafana/agent-core';

export class MyInstrumentation extends BaseInstrumentation {
  readonly version = '1.0.0';
  readonly name = 'my-instrumentation';

  initialize(): void {
    this.agent.api.pushLog(['hello from my instrumentation']);
  }
}

initializeGrafanaAgent({
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
import { agent, initializeGrafanaAgent } from '@grafana/agent-core';

initializeGrafanaAgent({
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

## Transports

Transports are functions that will be called for every event that is triggered by the API. They are used to do
something with the data after collecting it.

Out of the box, no transports are provided in the `core` package and they should be provided by platform specific
packages like [@grafana/agent-web](https://github.com/grafana/grafana-javascript-agent/tree/main/packages/web)

You can also define your own transports:

```ts
import { agent, initializeGrafanaAgent, BaseTransport, TransportItem } from '@grafana/agent-core';

class MyTransport extends BaseTransport {
  send(item: TransportItem) {
    // do something with paylaod
  }
}

initializeGrafanaAgent({
  transports: [new MyTransport()],
});
```

## Unpatched console

Some instrumentations might override the default console methods but the agent provides a way to access the
unmodified console methods.

```ts
agent.unpatchedConsole.log('This is a log');
agent.unpatchedConsole.warn('This is a warning');
```

## Pause / unpause

Agent can be paused by invoking `agent.pause()`.
This will prevent events from being sent to transports.
Call `agent.unpause()` to resume capturing events.

## Isolated agents

Sometimes you may want to create one or more isolated agents. For example:

- you want to bundle the agent in a reusable library and report certain events only for it while the project where the
  library is used has its own agent
- you want to log certain events in one system while other events in other systems
- E2E libraries that may create multiple agents without refreshing the page

In order to achieve this, you can use the `isolate` flag when initializing the agent:

```ts
// agent 1 will be isolated
const agent1 = initializeGrafanaAgent({
  // ...
  isolate: true,
});

// globalAgent will be available globally
const globalAgent = initializeGrafanaAgent({
  // ...
  isolate: true,
});

// another isolated agent
const agent2 = initializeGrafanaAgent({
  // ...
  isolate: true,
});
```

Although an isolated agent may sound like a great idea, there are some limitations which apply to them:

- some instrumentations will still register globally (i.e. exceptions instrumentation or console instrumentation)
- an isolated agent will not be available on the global object
- the agent reference should be stored by the project as it won't be available via
  `import { agent } from '@grafana/agent-core';`
