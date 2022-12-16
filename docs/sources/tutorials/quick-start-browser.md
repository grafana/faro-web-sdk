# Get started with Grafana Faro Web SDK

This document describes how to set up and use Grafana Faro Web SDK. For more information, refer to the
[demo application][demo-app].

## Before you begin

- Set up a Grafana Agent instance. For more information, refer to [Set up Grafana Agent][grafana-agent-setup].
- Configure your instance with `app-agent-receiver` integration. The integration exposes an http collection endpoint and
  runs with the `integrations-next` flag enabled.

The following example shows a basic Grafana Agent configuration that exposes a collector endpoint at
[http://host:12345/collect][grafana-agent-collect] and forwards collected telemetry to Loki, Tempo, and Prometheus
instances. This collector endpoint has to be accessible by your web application. For more information about the app
agent receiver integration, refer to [app_agent_receiver_config][grafana-agent-receiver-config].

```yaml
metrics:
  wal_directory: /tmp/wal
  global: {}
  configs:
    - name: default
      remote_write:
        - url: https://prometheus-us-central1.grafana.net/api/prom/push
          basic_auth:
            username: xxx
            password: xxx
logs:
  positions_directory: /tmp/loki-pos
  configs:
    - name: default
      scrape_configs: []
      clients:
        - url: https://xxx:xxx@logs-prod-us-central1.grafana.net/loki/api/v1/push
traces:
  configs:
    - name: default
      remote_write:
        - endpoint: tempo-us-central1.grafana.net:443
          basic_auth:
            username: xxx
            password: xxx
      receivers:
        otlp:
          protocols:
            grpc:
            http:
              cors:
                allowed_origins:
                  - http://localhost:1234
                max_age: 7200
integrations:
  app_agent_receiver_configs:
    - autoscrape:
        enable: true
        metrics_instance: 'default'
      api_key: 'secret' # optional, if set, client will be required to provide it via x-api-key header
      instance: 'frontend'
      logs_instance: 'default'
      traces_instance: 'default'
      server:
        host: 0.0.0.0
        port: 12345
        cors_allowed_origins:
          - 'https://my-app.example.com'
      logs_labels: # labels to add to loki log record
        app: frontend # static value
        kind: # value will be taken from log items. exception, log, measurement, etc
      logs_send_timeout: 5000
      sourcemaps:
        download: true # will download source file, extract source map location,
        # download source map and use it to transform stack trace locations
```

## Install Grafana Faro Web SDK

1. Run one of the following commands, depending on your package manager. The command installs the library in your
   project.

   ```bash
   #npm
   npm i -S @grafana/faro-web-sdk

   #yarn
   yarn add @grafana/faro-web-sdk
   ```

1. To enable [OpenTelemetry][opentelemetry-js] based tracing, run one of the following commands.

   ```bash
   #npm
   npm i -S @grafana/faro-web-tracing

   #yarn
   yarn add @grafana/faro-web-tracing
   ```

## Initialize Grafana Faro Web SDK

Grafana Faro Web SDK must be initialized when your web application starts. The following sections provide several
initialization examples. Choose one initialization method, add it to your application code, and customize it as
required.

### Basic

The following basic configuration sets up the Grafana Faro Web SDK to automatically collect uncaught errors, logs and
[web vitals][web-vitals] measurements. Without tracing, the bundle footprint is small.

```ts
import { initializeFaro } from '@grafana/faro-web-sdk';

const faro = initializeFaro({
  url: 'https://collector-host:12345/collect',
  apiKey: 'secret',
  app: {
    name: 'frontend',
    version: '1.0.0',
  },
});
```

### Advanced

The following example shows you how to specify and customize transports and instrumentations.

```ts
import {
  ConsoleInstrumentation,
  ConsoleTransport,
  ErrorsInstrumentation,
  FetchTransport,
  initializeFaro,
  LogLevel,
  SessionInstrumentation,
  WebVitalsInstrumentation,
} from '@grafana/faro-web-sdk';

const faro = initializeFaro({
  instrumentations: [
    new ErrorsInstrumentation(),
    new WebVitalsInstrumentation(),
    new ConsoleInstrumentation({
      disabledLevels: [LogLevel.TRACE, LogLevel.ERROR], // console.log will be captured
    }),
    new SessionInstrumentation(),
  ],
  transports: [
    new FetchTransport({
      url: 'http://localhost:12345/collect',
      apiKey: 'secret',
    }),
    new ConsoleTransport(),
  ],
  app: {
    name: 'frontend',
    version: '1.0.0',
  },
});
```

### With OpenTelemetry tracing using the included instrumentation

Due to it's large size, [OpenTelemetry][opentelemetry-js] tracing support is provided in a separate
`@grafana/faro-web-tracing` package.

The provided default OTel setup includes tracing instrumentations for user interaction, fetch and document load, and W3C
trace context propagation via `fetch` and `xhr`.

```ts
import { getWebInstrumentations, initializeFaro } from '@grafana/faro-web-sdk';
import { TracingInstrumentation } from '@grafana/faro-web-tracing';

const faro = initializeFaro({
  url: 'http://localhost:12345/collect',
  apiKey: 'secret',
  instrumentations: [...getWebInstrumentations(), new TracingInstrumentation()],
  app: {
    name: 'frontend',
    version: '1.0.0',
  },
});

// get OTel trace and context APIs
const { trace, context } = faro.api.getOTEL();

const tracer = trace.getTracer('default');
const span = tracer.startSpan('click');
context.with(trace.setSpan(context.active(), span), () => {
  doSomething();
  span.end();
});
```

### With custom OpenTelemetry tracing configuration

The following example configure OTel manually and uses `FaroTraceExporter` and call `faro.api.initOTEL` with OTel trace
and context APIs.

```ts
import { trace, context } from '@opentelemetry/api';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { UserInteractionInstrumentation } from '@opentelemetry/instrumentation-user-interaction';
import { XMLHttpRequestInstrumentation } from '@opentelemetry/instrumentation-xml-http-request';
import { Resource } from '@opentelemetry/resources';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { initializeFaro } from '@grafana/faro-web-sdk';
import { FaroSessionSpanProcessor, FaroTraceExporter } from '@grafana/faro-web-tracing';

const VERSION = '1.0.0';
const NAME = 'frontend';
const COLLECTOR_URL = 'http://localhost:12345/collect';

// initialize faro
const faro = initializeFaro({
  url: COLLECTOR_URL,
  apiKey: 'secret',
  app: {
    name: NAME,
    version: VERSION,
  },
});

// set up otel
const resource = Resource.default().merge(
  new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: NAME,
    [SemanticResourceAttributes.SERVICE_VERSION]: VERSION,
  })
);

const provider = new WebTracerProvider({ resource });

provider.addSpanProcessor(new FaroSessionSpanProcessor(new BatchSpanProcessor(new FaroTraceExporter({ faro }))));

provider.register({
  propagator: new W3CTraceContextPropagator(),
  contextManager: new ZoneContextManager(),
});

const ignoreUrls = [COLLECTOR_URL];

registerInstrumentations({
  instrumentations: [
    new DocumentLoadInstrumentation(),
    new FetchInstrumentation({ ignoreUrls }),
    new XMLHttpRequestInstrumentation({ ignoreUrls }),
    new UserInteractionInstrumentation(),
  ],
});

// register OTel with Faro
faro.api.initOTEL(trace, context);
```

## Usage examples

The following examples show how to use the SDK to push data manually and set users and sessions.

```ts
import { LogLevel } from '@grafana/faro-web-sdk';

// there's a global property
const faro = window.faro;

// send a log message
// by default info, warn and error levels are captured.
// trace, debug and log are not
console.info('Hello world', 123);
// or
faro.api.pushLog(['Hello world', 123], { level: LogLevel.Debug });

// log with context
faro.api.pushLog(['Sending update'], {
  context: {
    payload: thePayload,
  },
  level: LogLevel.TRACE,
});

// set user metadata, to be included with every event. All properties optional
faro.api.setUser({
  email: 'bob@example.com',
  id: '123abc',
  username: 'bob',
  attributes: {
    role: 'manager',
  },
});

// unset user
faro.api.resetUser();

// set session metadata, to be included with every event
faro.api.setSession(createSession({ plan: 'paid' }));

// unset session
faro.api.resetSession();

// push measurement
faro.api.pushMeasurement({
  type: 'cart-transaction',
  values: {
    delay: 122,
    duration: 4000,
  },
});

// push an error
faro.api.pushError(new Error('everything went horribly wrong'));

// push an event
faro.api.pushEvent('navigation', { url: window.location.href });

// pause faro, preventing events from being sent
faro.pause();

// resume sending events
faro.unpause();
```

## Dashboards

Two example Grafana dashboards are included in this repository. Add them to your Grafana instance using the dashboard
import function.

[Web Application Dashboard][faro-app-dashboard]

- monitor a web application using data collected by Faro Web SDK

[Grafana Agent app agent receiver dashboard][faro-agent-dashboard]

- monitor Grafana Agent app receiver integration

[grafana-agent-collect]: http://host:12345/collect
[grafana-agent-receiver-config]: https://grafana.com/docs/agent/latest/configuration/integrations/integrations-next/app-agent-receiver-config/
[grafana-agent-setup]: https://grafana.com/docs/agent/latest/set-up/
[opentelemetry-js]: https://opentelemetry.io/docs/instrumentation/js/
[web-vitals]: https://github.com/GoogleChrome/web-vitals
[demo-app]: ../../../demo
[faro-agent-dashboard]: ../../../dashboards/app-agent-receiver.json
[faro-app-dashboard]: ../../../dashboards/frontend-application.json
