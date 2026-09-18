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
- os - captures OS name and version parsed from the user agent
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

## Web workers

Dedicated web workers and shared workers (`SharedWorker`) are supported. Call
`initializeFaro` inside the worker. Worker globals are detected automatically;
no `window` or `document` shim is needed. The default instruments capture errors,
unhandled promise rejections, console messages, and session-start events.
Explicit events and measurements work through the normal Faro API.

Worker metadata includes SDK, browser, and OS information where available, but
does not include a page URL or viewport. DOM interactions, navigation, web vitals,
page performance, and session replay are not part of worker instrumentation.
`getWebInstrumentations()` selects the worker defaults when called in a worker;
do not explicitly add page-only instrumentations there.

For example, in a shared worker's module:

```ts
import { getWebInstrumentations, initializeFaro } from '@grafana/faro-web-sdk';
import { TracingInstrumentation } from '@grafana/faro-web-tracing';

const faro = initializeFaro({
  url: 'https://collector.example.com/collect',
  app: { name: 'background-processing' },
  instrumentations: [...getWebInstrumentations(), new TracingInstrumentation()],
});

self.addEventListener('connect', (event: MessageEvent) => {
  const port = event.ports[0];
  port?.addEventListener('message', () => {
    faro.api.pushEvent('worker-message');
  });
  port?.start();
});
```

Initialize once per worker, not once per connected port. The session lives in
memory for that Faro instance's lifetime, independently of the connected tabs.
It does not use browser storage, rotate on inactivity, or adopt a tab's session.
`sessionTracking.persistent` cannot persist worker sessions and produces a warning.
Sampling uses the configured sampling rate or sampler, as in the browser.
To supply an identity, use `sessionTracking.session.id` or `generateSessionId`.
Use `api.setSession` or `api.resetSession` to replace the session explicitly.

With `sessionTracking.enabled: false`, no session or session-start event is created
automatically. For request tracing in this mode, provide caller-managed session
metadata with the sampling decision in `session.attributes.isSampled` (`'true'`
or `'false'`). Otherwise spans are not recorded.

Request tracing is optional and instruments available fetch and XMLHttpRequest
APIs. Configure `propagateTraceHeaderCorsUrls` for cross-origin trace propagation
as in a web page. Trace context is not automatically propagated through
`MessagePort` messages. Assign user identity explicitly: a shared worker may serve
several tabs, and the SDK does not infer which tab owns a request.

Workers have no pagehide or document visibility lifecycle. Telemetry uses normal
batch timers; abruptly terminating a worker can lose pending telemetry. Service
worker activation, suspension, and `waitUntil` delivery are not supported, even
though the common instrumentation has unit coverage without DOM or XHR APIs.

Worker lifetime is controlled by the browser. In the tested Playwright WebKit 26.5
build, a shared worker stopped responding after its creating tab closed despite
another tab remaining connected. This also reproduced without Faro; applications
that require continuity across tab closures should verify their target browsers.

[grafana-alloy-docs]: https://grafana.com/docs/alloy/latest/
[grafana-logs]: https://grafana.com/logs/
[grafana-traces]: https://grafana.com/traces/
[quick-start]: https://github.com/grafana/faro-web-sdk/blob/main/docs/sources/tutorials/quick-start-browser.md
[use-cdn]: https://github.com/grafana/faro-web-sdk/blob/main/docs/sources/tutorials/use-cdn-library.md
