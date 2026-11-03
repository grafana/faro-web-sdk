# Get started with Grafana Faro Web SDK

This document describes how to set up and use Grafana Faro Web SDK. For a real-world reference instrumentation, see
the [QuickPizza demo application][demo-app] — deployed live at
[quickpizza.grafana-dev.com](https://quickpizza.grafana-dev.com) and instrumented with the current Faro packages.

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
   For a [custom OpenTelemetry setup](#with-custom-opentelemetry-tracing-configuration), also install
   the direct dependencies listed in that section.

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

### With session sampling below 100%

Session sampling is all or nothing per session. When a session is not part of the sample, Faro
discards every signal it produces in the browser. The fetch and XMLHttpRequest instrumentations
still add a `traceparent` header to outgoing requests, but that header carries the unsampled flag
`00`.

Backend OpenTelemetry SDKs use the `parentbased_always_on` sampler by default, which honors an
unsampled parent and drops the server span. Lowering `sessionTracking.samplingRate` therefore also
removes traces from your backend services, not only from the browser.

Set `omitTraceContextForUnsampledSessions` to leave the header off entirely for unsampled sessions,
so each backend service applies its own sampling rules to those requests.

```ts
import { getWebInstrumentations, initializeFaro } from '@grafana/faro-web-sdk';
import { TracingInstrumentation } from '@grafana/faro-web-tracing';

const faro = initializeFaro({
  url: 'http://localhost:12345/collect',
  apiKey: 'secret',
  sessionTracking: {
    samplingRate: 0.1, // 10% of sessions send frontend signals
  },
  instrumentations: [
    ...getWebInstrumentations(),
    new TracingInstrumentation({ omitTraceContextForUnsampledSessions: true }),
  ],
  app: {
    name: 'frontend',
    version: '1.0.0',
  },
});
```

Requests from an unsampled session then begin a new trace on the backend instead of joining the
browser's, so those traces are recorded but no longer link back to the frontend. The frontend side
of that link would have pointed at browser data Faro already discarded.

This option defaults to `false` to preserve existing behavior, and is expected to become the default
in the next major version.

### With custom OpenTelemetry tracing configuration

The following example, demonstrates how to configure OpenTelemetry
manually using the `FaroTraceExporter`. To achieve this, we call the
`faro.api.initOTEL` function with the `OTELTraceAPI` and `OTELContextAPI` as parameters.

If you want to change or modify the instrumentations used,
you can easily achieve this by utilizing the
[instrumentations option](https://github.com/grafana/faro-web-sdk/blob/main/packages/web-tracing/src/types.ts)
within the `TracingInstrumentation` class.

Install each package imported by the custom setup as a direct dependency. The version ranges below
keep the example on OpenTelemetry SDK 3.x, matching `@grafana/faro-web-tracing`. SDK 3.x supports
`@opentelemetry/api` 1.10.x only, so the API stays on 1.10.x. SDK 3.x also needs webpack 5.54+, Jest 29.4+
or Parcel with `packageExports` enabled, see the
[OpenTelemetry JS 3.x migration guide](https://github.com/open-telemetry/opentelemetry-js/blob/main/doc/3.x/migration-guide.md#bundler-requirements-for-packages-with-platform-specific-code).

```bash
#npm
npm i -S @grafana/faro-web-sdk @grafana/faro-web-tracing \
  @opentelemetry/api@~1.10.0 @opentelemetry/context-zone-peer-dep@^3.0.0 zone.js@^0.16.0 \
  @opentelemetry/core@^3.0.0 @opentelemetry/resources@^3.0.0 \
  @opentelemetry/sdk-trace@^3.0.0 @opentelemetry/semantic-conventions@^1.32.0 \
  @opentelemetry/instrumentation@^0.300.0 @opentelemetry/instrumentation-document-load@^0.69.0 \
  @opentelemetry/instrumentation-fetch@^0.300.0 @opentelemetry/instrumentation-xml-http-request@^0.300.0

#yarn
yarn add @grafana/faro-web-sdk @grafana/faro-web-tracing \
  @opentelemetry/api@~1.10.0 @opentelemetry/context-zone-peer-dep@^3.0.0 zone.js@^0.16.0 \
  @opentelemetry/core@^3.0.0 @opentelemetry/resources@^3.0.0 \
  @opentelemetry/sdk-trace@^3.0.0 @opentelemetry/semantic-conventions@^1.32.0 \
  @opentelemetry/instrumentation@^0.300.0 @opentelemetry/instrumentation-document-load@^0.69.0 \
  @opentelemetry/instrumentation-fetch@^0.300.0 @opentelemetry/instrumentation-xml-http-request@^0.300.0
```

```ts
import 'zone.js';

import { trace, context, propagation } from '@opentelemetry/api';
import { ZoneContextManager } from '@opentelemetry/context-zone-peer-dep';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { XMLHttpRequestInstrumentation } from '@opentelemetry/instrumentation-xml-http-request';
import { defaultResource, resourceFromAttributes } from '@opentelemetry/resources';
import { BatchSpanProcessor, TracerProvider } from '@opentelemetry/sdk-trace';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

import { initializeFaro } from '@grafana/faro-web-sdk';
import {
  FaroMetaAttributesSpanProcessor,
  FaroTraceExporter,
  FaroUserActionSpanProcessor,
} from '@grafana/faro-web-tracing';

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
const resource = defaultResource().merge(
  resourceFromAttributes({
    [ATTR_SERVICE_NAME]: NAME,
    [ATTR_SERVICE_VERSION]: VERSION,
  })
);

const provider = new TracerProvider({
  resource,
  spanProcessors: [
    new FaroUserActionSpanProcessor(
      new FaroMetaAttributesSpanProcessor(
        new BatchSpanProcessor({ exporter: new FaroTraceExporter({ api: faro.api }) }),
        faro.metas
      )
    ),
  ],
});

trace.setGlobalTracerProvider(provider);
propagation.setGlobalPropagator(new W3CTraceContextPropagator());
context.setGlobalContextManager(new ZoneContextManager().enable());

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

[grafana-alloy-collect]: http://host:12345/collect
[grafana-alloy-receiver-config]: https://grafana.com/docs/alloy/latest/reference/components/faro.receiver/
[grafana-alloy-setup]: https://grafana.com/docs/alloy/latest/get-started/
[opentelemetry-js]: https://opentelemetry.io/docs/instrumentation/js/
[web-vitals]: https://github.com/GoogleChrome/web-vitals
[demo-app]: https://github.com/grafana/quickpizza
