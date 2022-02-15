# Grafana JavaScript Agent

Grafana JavaScript Agent is a library that enables applications (both frontend and backend) to interact with external
services like [Grafana](https://grafana.com/grafana/), [Prometheus](https://prometheus.io/),
[Loki](https://grafana.com/logs/), [Tempo](https://grafana.com/traces/) etc.

The repository consists of multiple packages that should be combined depending on the needs, as well as a [demo](https://github.com/grafana/grafana-javascript-agent/tree/main/demo)
which can be ran by following the [README.md file](https://github.com/grafana/grafana-javascript-agent/tree/main/demo/README.md).

## Packages

### Core

[@grafana/javascript-agent-core](https://github.com/grafana/grafana-javascript-agent/tree/main/packages/core) is the
main package that provides the core functionality of the agent. The [README.md](https://github.com/grafana/grafana-javascript-agent/tree/main/packages/core/README.md)
file provides an overview of the architecture and the API of library.

### Instrumentations

1. [@grafana/javascript-agent-instrumentation-console](https://github.com/grafana/grafana-javascript-agent/tree/main/packages/instrumentation-console)
   is a package for both, browsers and Node.js, which provides an automatic mechanism for collecting console events.
1. [@grafana/javascript-agent-instrumentation-errors](https://github.com/grafana/grafana-javascript-agent/tree/main/packages/instrumentation-errors)
   is a browser package which provides an automatic mechanism for collecting unhandled exceptions and errors.
1. [@grafana/javascript-agent-instrumentation-tracing](https://github.com/grafana/grafana-javascript-agent/tree/main/packages/instrumentation-tracing)
   is a package for both, browsers and Node.js, which provides an automatic mechanism for tracing. FOR THE TIME BEING
   THIS PACKAGE IS A PLACEHOLDER.
1. [@grafana/javascript-agent-instrumentation-web-vitals](https://github.com/grafana/grafana-javascript-agent/tree/main/packages/instrumentation-web-vitals)
   is a browser package which collects [web vitals](https://web.dev/vitals/) metrics from the app.

### Meta

1. [@grafana/javascript-agent-meta-browser](https://github.com/grafana/grafana-javascript-agent/tree/main/packages/meta-browser)
   is a browser package for collecting details about the browser, operating system and device type.
1. [@grafana/javascript-agent-meta-page](https://github.com/grafana/grafana-javascript-agent/tree/main/packages/meta-page)
   is a browser package for collecting details about the current page (i.e. the URL, page title etc.).

### Transports

1. [@grafana/javascript-agent-transport-console](https://github.com/grafana/grafana-javascript-agent/tree/main/packages/transport-console)
   is a package for both, browsers and Node.js, which shows the collected data in the console.
1. [@grafana/javascript-agent-transport-fetch](https://github.com/grafana/grafana-javascript-agent/tree/main/packages/transport-fetch)
   is a browser package for sending the collected data to a specified URL using `fetch`.

### Integrations

1. [@grafana/javascript-agent-integration-angular](https://github.com/grafana/grafana-javascript-agent/tree/main/packages/integration-angular)
   is a package that enables easier integration in projects built with Angular. FOR THE TIME BEING
   THIS PACKAGE IS A PLACEHOLDER.
1. [@grafana/javascript-agent-integration-react](https://github.com/grafana/grafana-javascript-agent/tree/main/packages/transport-fetch)
   is a package that enables easier integration in projects built with React. FOR THE TIME BEING
   THIS PACKAGE IS A PLACEHOLDER.
