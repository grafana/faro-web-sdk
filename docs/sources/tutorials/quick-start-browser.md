# Get started with Grafana Faro Web SDK

This document describes how to set up and use Grafana Faro Web SDK. For more information, refer to the
[demo application][demo-app].

## Before you begin

- Set up a Grafana Alloy instance. For more information, refer to [Set up Grafana Alloy][grafana-alloy-setup].
- Configure your instance with `app-agent-receiver` integration. The integration exposes an http collection endpoint and
  runs with the `integrations-next` flag enabled.

The following example shows a basic Grafana Alloy configuration that exposes a collector endpoint at
[http://host:12345/collect][grafana-alloy-collect] and forwards collected telemetry to Loki, Tempo, and Prometheus
instances. This collector endpoint has to be accessible by your web application. For more information about the app
agent receiver integration, refer to [app_agent_receiver_config][grafana-alloy-receiver-config].

```river
prometheus.remote_write "metrics_write" {
    endpoint {
        name = "default"
        url  = <remote_write_url>
        queue_config { }
        metadata_config { }
    }
}

loki.process "logs_process_client" {
    forward_to = [loki.write.logs_write_client.receiver]

    stage.logfmt {
        mapping = { "kind" = "", "service_name" = "", "app" = "" }
    }

    stage.labels {
        values = { "kind" = "kind", "service_name" = "service_name", "app" = "app" }
    }
}

loki.write "logs_write_client" {
    endpoint {
        url = <loki_write_url>
    }
}

logging {
    level = "info"
}

faro.receiver "integrations_app_agent_receiver" {
    server {
        listen_address           = "0.0.0.0"
        listen_port              = 12345
        cors_allowed_origins     = ["https://my-app.example.com"]
        api_key                  = my_super_app_key
        max_allowed_payload_size = "10MiB"

        rate_limiting {
            rate = 100
        }
    }

    sourcemaps { }

    output {
        logs   = [loki.process.logs_process_client.receiver]
        traces = [otelcol.exporter.otlp.trace_write.input]
    }
}

otelcol.receiver.otlp "default" {
    grpc {
        include_metadata = true
    }

    output {
        metrics = []
        logs    = []
        traces  = [otelcol.exporter.otlp.trace_write.input]
    }
}

otelcol.exporter.otlp "trace_write" {
    retry_on_failure {
        max_elapsed_time = "1m0s"
    }

    client {
        endpoint = <tempo_endpoint>
    }
}
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

The provided default OTel setup includes tracing instrumentations for fetch and xhr requests as well
as W3C trace context propagation via `fetch` and `xhr`.

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

### With OpenTelemetry tracing on backend on different domain than frontend

By default, OpenTelemetry's XMLHttpRequestInstrumentation and FetchInstrumentation
inject the traceparent header only into requests send to the same origin as the current window.
To enable this functionality for other origins, you can enable it by setting up propagateTraceHeaderCorsUrls as shown below.

```ts
import { getWebInstrumentations, initializeFaro } from '@grafana/faro-web-sdk';
import { TracingInstrumentation } from '@grafana/faro-web-tracing';

const instrumentationOptions = {
  propagateTraceHeaderCorsUrls: [new RegExp('BACKEND_SERVER(S)_REGEX')], // This is a list of specific URIs or regular exprressions
};

const faro = initializeFaro({
  url: 'http://localhost:12345/collect',
  apiKey: 'secret',
  instrumentations: [...getWebInstrumentations(), new TracingInstrumentation({ instrumentationOptions })],
  app: {
    name: 'frontend',
    version: '1.0.0',
  },
});
```

### With custom OpenTelemetry tracing configuration

The following example, demonstrates how to configure OpenTelemetry
manually using the `FaroTraceExporter`. To achieve this, we call the
`faro.api.initOTEL` function with the `OTELTraceAPI` and `OTELContextAPI` as parameters.

If you want to change or modify the instrumentations used,
you can easily achieve this by utilizing the
[instrumentations option](https://github.com/grafana/faro-web-sdk/blob/main/packages/web-tracing/src/types.ts)
within the `TracingInstrumentation` class.

```ts
import { trace, context } from '@opentelemetry/api';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { XMLHttpRequestInstrumentation } from '@opentelemetry/instrumentation-xml-http-request';
import { Resource } from '@opentelemetry/resources';
import { BatchSpanProcessor, WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

import { initializeFaro } from '@grafana/faro-web-sdk';
import { FaroMetaAttributesSpanProcessor, FaroTraceExporter } from '@grafana/faro-web-tracing';

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
    [SEMRESATTRS_SERVICE_NAME]: NAME,
    [SEMRESATTRS_SERVICE_VERSION]: VERSION,
  })
);

const provider = new WebTracerProvider({ resource });

provider.addSpanProcessor(
  new FaroUserActionSpanProcessor(
    new FaroMetaAttributesSpanProcessor(new BatchSpanProcessor(new FaroTraceExporter({ ...faro })))
  )
);

provider.register({
  propagator: new W3CTraceContextPropagator(),
  contextManager: new ZoneContextManager(),
});

const ignoreUrls = [COLLECTOR_URL];

// Please be aware that this instrumentation originates from OpenTelemetry
// and cannot be used directly in the initializeFaro instrumentations options.
// If you wish to configure these instrumentations using the initializeFaro function,
// please utilize the instrumentations options within the TracingInstrumentation class.
registerInstrumentations({
  instrumentations: [
    new DocumentLoadInstrumentation(),
    new FetchInstrumentation({ ignoreUrls }),
    new XMLHttpRequestInstrumentation({ ignoreUrls }),
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

## How to activate debugging

To enable the Faro internal logger, follow these steps:

```ts
import { initializeFaro, InternalLoggerLevel } from '@grafana/faro-web-sdk';

const faro = initializeFaro({
  url: 'https://collector-host:12345/collect',
  apiKey: 'secret',
  app: {
    name: 'frontend',
    version: '1.0.0',
  },
  internalLoggerLevel: InternalLoggerLevel.VERBOSE, // Possible values are: OFF, ERROR, WARN, INFO, VERBOSE
});
```

To enable the OpenTelemetry debug logger, follow these steps:

```ts
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
```

## Dashboards

Two example Grafana dashboards are included in this repository. Add them to your Grafana instance using the dashboard
import function.

[Web Application Dashboard][faro-app-dashboard]

- monitor a web application using data collected by Faro Web SDK

[Grafana Alloy app agent receiver dashboard][faro-agent-dashboard]

- monitor Grafana Alloy app receiver integration

[grafana-alloy-collect]: http://host:12345/collect
[grafana-alloy-receiver-config]: https://grafana.com/docs/alloy/latest/reference/components/faro.receiver/
[grafana-alloy-setup]: https://grafana.com/docs/alloy/latest/get-started/
[opentelemetry-js]: https://opentelemetry.io/docs/instrumentation/js/
[web-vitals]: https://github.com/GoogleChrome/web-vitals
[demo-app]: ../../../demo
[faro-agent-dashboard]: ../../../dashboards/app-agent-receiver.json
[faro-app-dashboard]: ../../../dashboards/frontend-application.json
