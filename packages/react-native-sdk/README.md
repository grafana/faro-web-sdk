# @grafana/faro-web-sdk

Faro is a SDK that can instrument frontend JavaScript applications to collect telemetry and forward it to the
[Grafana Alloy][grafana-alloy-docs] (with app agent receiver integration enabled).

Grafana Alloy can then send this data to either [Loki][grafana-logs] or [Tempo][grafana-traces].

## Get started

See [quick start for web applications][quick-start].

Alternatively, you can use the CDN version of the library. See [use cdn library][use-cdn] for details on how to do so.

## Instrumentations

- console - captures messages logged to `console` global object. Only `warn`, `info` and `error` levels by default.
- errors - captures unhandled top level exceptions
- web-vitals - captures performance metrics reported by web vitals API
- session - sends session start event
- view - sends view changed event

## Metas

- browser - captures browser metadata: name, version, etc
- page - captures current URL
- view - the web SDK enforces a `default` value for the view meta

## Transports

- console - logs events to global `console`
- fetch - sends events over HTTP to a backend

## Example

Basic set up, will automatically report errors and web vitals:

```ts
import { initializeFaro } from '@grafana/faro-web-sdk';

const faro = initializeFaro({
  url: 'https://agent.myapp/collect',
  apiKey: 'secret',
  app: {
    name: 'frontend',
    version: '1.0.0',
  },
});

// send a log message
faro.api.pushLog(['hello world']);

// will be captured
throw new Error('oh no');

// push error manually
faro.api.pushError(new Error('oh no'));
```

With OTel tracing and browser console capture:

```ts
import { ConsoleInstrumentation, getWebInstrumentations, initializeFaro } from '@grafana/faro-web-sdk';
import { TracingInstrumentation } from '@grafana/faro-web-tracing';

const faro = initializeFaro({
  url: 'https://agent.myapp/collect',
  apiKey: 'secret',
  instrumentations: [...getWebInstrumentations({ captureConsole: true }), new TracingInstrumentation()],
  app: {
    name: 'frontend',
    version: '1.0.0',
  },
});

// start a span
faro.api
  .getOTEL()
  ?.trace.getTracer('frontend')
  .startActiveSpan('hello world', (span) => {
    // send a log message
    faro.api.pushLog(['hello world']);
    span.end();
  });

// will be captured
throw new Error('oh no');
```

[grafana-alloy-docs]: https://grafana.com/docs/alloy/latest/
[grafana-logs]: https://grafana.com/logs/
[grafana-traces]: https://grafana.com/traces/
[quick-start]: https://github.com/grafana/faro-web-sdk/blob/main/docs/sources/tutorials/quick-start-browser.md
[use-cdn]: https://github.com/grafana/faro-web-sdk/blob/main/docs/sources/tutorials/use-cdn-library.md
