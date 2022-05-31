# Get started with Grafana Javascript Agent

This document describes how to set up and use Grafana Javascript Agent. For more information, refer to [demo application](https://github.com/grafana/grafana-javascript-agent/tree/main/demo).

## Before you begin

* Set up a Grafana Agent instance. For more information , refer to [Grafana Agent set up documentation](https://grafana.com/docs/agent/latest/set-up/).
* Configure your instance with `app-agent-receiver` integration to expose a http collection
endpoint and run with the `integrations-next` flag enabled.

The following is an example of a basic Grafana Agent configuration that exposes a collector endpoint
at [http://host:12345/collect](http://host:12345/collect) and forwards collected telemetry to Loki,
Tempo, and Prometheus instances. For more information, refer to [agent app receiver integration documentation](https://github.com/grafana/agent/blob/main/docs/user/configuration/integrations/integrations-next/app-agent-receiver-config.md).

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
        metrics_instance: "default"
      api_key: "secret" # optional, if set, client will be required to provide it via x-api-key header
      instance: "frontend"
      logs_instance: "default"
      traces_instance: "default"
      server:
        host: 0.0.0.0
        port: 12345
        cors_allowed_origins:
          - "https://my-app.example.com"
      logs_labels: # labels to add to loki log record
        app: frontend # static value
        kind:         # value will be taken from log items. exception, log, measurement, etc
      logs_send_timeout: 5000
      sourcemaps:
        download: true # will download source file, extract source map location,
        # download source map and use it to transform stack trace locations
```

## 1. Install Grafana Javascript Agent

Add `@grafana/agent-web` dependency to your web app bundle.

```bash
#npm
npm i -S @grafana/agent-web

#yarn
yarn add @grafana/agent-web
```

## 2. Initialize Grafana Javascript Agent

Grafana Javascript Agent has to be initialized when your web app starts. Several intiailization snippet examples included below.

### Basic

Will set up the agent with basic default instrumentations to automatically collect uncaught errors, [web vitals](https://github.com/GoogleChrome/web-vitals). No tracing, low footprint.

```javascript
import { initializeAgent } from '@grafana/agent-web';

const agent = initializeAgent({
  url: 'https://collector-host:12345/collect',
  apiKey: 'secret',
  app: {
    name: 'frontend',
    version: '1.0.0',
  }
});
```

### Advanced

You can also customize transports and instrumentations.

```javascript
import { LogLevel, ConsoleInstrumentation, initializeAgent, FetchTransport, ConsoleTransport, WebVitalsInstrumentation, ErrorsInstrumentation } from '@grafana/agent-web';

const agent = initializeAgent({
  instrumentations: [
    new ErrorsInstrumentation(),
    new WebVitalsInstrumentation(),
    new ConsoleInstrumentation({
      disabledLevels: [LogLevel.TRACE, LogLevel.ERROR] // console.log will be captured
    })],
  transports: [
    new FetchTransport({
      url: 'http://localhost:12345/collect',
      apiKey: 'secret',
    }),
    new ConsoleTransport()
  ],
  app: {
    name: 'frontend',
    version: '1.0.0',
  },
});
```


### With Open Telemetry tracing using the included instrumentation

Due to it's hefty size, [Open Telemetry](https://opentelemetry.io/docs/instrumentation/js/)
tracing support is provided in a separate `@grafna/agent-tracing-web` package.

Using a provided default OTEL setup, which includes tracing instrumentations for user
interaction, fetch and document load, W3C trace context propagation via `fetch` and `xhr`.

```javascript
import { TracingInstrumentation } from '@grafana/agent-tracing-web';
import { initializeAgent, getDefaultInstrumentations } from '@grafana/agent-web';

const agent = initializeAgent({
  url: 'http://localhost:12345/collect',
  apiKey: 'secret',
  instrumentations: [...getDefaultInstrumentations(), new TracingInstrumentation()],
  app: {
    name: 'frontend',
    version: '1.0.0',
  },
});

// get otel trace and context apis
const { trace, context } = agent.api.getOTEL();

const tracer = trace.getTracer('default');
const span = tracer.startSpan('click');
context.with(trace.setSpan(context.active(), span), () => {
  doSoemthing();
  span.end();
})
```

###  With custom Open Telemetry tracing configuration

Configure OTEL manually. Have to use `GrafanaAgentTraceExporter` and call `agent.api.initOTEL`
with OTEL trace and context APIs.

```javascript
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
import { initializeAgent } from '@grafana/agent-web';
import { GrafanaAgentTraceExporter } from '@grafana/agent-trace-web';

const VERSION = '1.0.0';
const NAME = 'frontend';
const COLLECTOR_URL = 'http://localhost:12345/collect';

// initialize agent
const agent = initializeAgent({
  url: COLLECTOR_URL,
  apiKey: 'secret',
  app: {
    name: NAME,
    version: VERSION,
  },
});

// set up otel
const resource = Resource.default().merge(new Resource({
  [SemanticResourceAttributes.SERVICE_NAME]: NAME,
  [SemanticResourceAttributes.SERVICE_VERSION]: VERSION
}));

const provider = new WebTracerProvider({ resource });
provider.addSpanProcessor(new BatchSpanProcessor(new GrafanaAgentTraceExporter({ agent })));
provider.register({
  propagator: new W3CTraceContextPropagator(),
  contextManager: new ZoneContextManager(),
});
const ignoreUrls = [COLLECTOR_URL];
registerInstrumentations({
  instrumentations: [
    new DocumentLoadInstrumentation() as any,
    new FetchInstrumentation({ ignoreUrls }),
    new XMLHttpRequestInstrumentation({ ignoreUrls }),
    new UserInteractionInstrumentation()
  ]
});

// register otel with agent
agent.api.initOTEL(trace, context);
```

## Usage

```javascript
import { LogLevel } from '@grafana/agent-core';

// there's a global property
const agent = window.grafanaAgent;

// send a log message
agent.api.pushLog(["Hello world", 123], { level: LogLevel.Debug});

// log with context
agent.api.pushLog(["Navigation"], {
  context: {
    url: window.location.href
  },
  level: LogLevel.Trace
});

// set user metadata, to be included with every event. All properties optional
agent.api.setUser({
  email: 'bob@example.com',
  id: '123abc'
  username: 'bob'
  attributes: {
    role: 'manager',
  }
});

// push measurement
agent.api.pushMeasurement({
  type: 'cart-transaction',
  values: {
    delay: 122,
    duration: 4000
  }
});
```
