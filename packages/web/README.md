# @grafana/agent-web

Instrumentations, metas and transports for web applications.

_Warning_: currently pre-release and subject to frequent breaking changes. Use at your own risk.

## Instrumentations

- console - captures messages logged to `console` global object. Only `warn`, `info` and `error` levels by default.
- errors - captures unhandled top level exceptions
- web-vitals - captures performance metrics reported by web vitals API

## Metas

- browser - captures browser metadata: name, version, etc
- page - captures current URL

## Transports

- console - logs events to global `console`
- fetch - sends events over HTTP to a backend

## Example

Basic set up, will automatically report errors and web vitals:

```javascript
import { initializeGrafanaAgent } from '@grafana/agent-web';

const agent = initializeGrafanaAgent({
  url: 'https://agent.myapp/collect',
  apiKey: 'secret',
  app: {
    name: 'frontend',
    version: '1.0.0',
  },
});

// send a log message
agent.api.pushLog(['hello world']);

// will be captured
throw new Error('oh no');

// push error manually
agent.api.pushError(new Error('oh no'));
```

With OTel tracing and browser console capture:

```javascript
import { TracingInstrumentation } from '@grafana/agent-tracing-web';
import { ConsoleInstrumentation, initializeGrafanaAgent, getWebInstrumentations } from '@grafana/agent-web';

const agent = initializeGrafanaAgent({
  url: 'https://agent.myapp/collect',
  apiKey: 'secret',
  instrumentations: [...getWebInstrumentations({ captureConsole: true }), new TracingInstrumentation()],
  app: {
    name: 'frontend',
    version: '1.0.0',
  },
});

// start a span
agent.api
  .getOTEL()
  ?.trace.getTracer('frontend')
  .startActiveSpan('hello world', (span) => {
    // send a log message
    agent.api.pushLog(['hello world']);
    span.end();
  });

// will be captured
throw new Error('oh no');
```
