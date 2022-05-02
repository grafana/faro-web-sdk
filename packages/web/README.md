# @grafana/agent-web

Instrumentations, metas and transports for web applications.

## Instrumentations

- console - captures messages logged to `console` global object
- errors - captures unhandled top level exceptions
- web-vitals - captures performance metrics reported by web vitals API
- tracing - captures traces. @TODO

## Metas

- browser - captures browser metadata: name, version, etc
- page - captures current URL

## Transports

- console - logs events to global `console`
- fetch - sends events over HTTP to a backend

## Example

```javascript
import { initializeAgent } from '@grafana/agent-core';
import {
  ConsoleInstrumentation,
  ConsoleTransport,
  ErrorsInstrumentation,
  WebVitalsInstrumentation,
  browserMeta,
  pageMeta,
  FetchTransport,
} from '@grafana/agent-web';

const agent = initializeAgent({
  instrumentations: [
    new ConsoleInstrumentation(),
    new ErrorsInstrumentation(),
    new WebVitalsInstrumentation(),
  ],
  metas: [browserMeta, pageMeta],
  transports: [
    new ConsoleTransport(),
    new FetchTransport({
      url: 'https://agent.myapp/collect',
      debug: true,
      requestOptions: {
        headers: { 'x-api-key': 'secret' },
      },
    }),
  ],
});
```
