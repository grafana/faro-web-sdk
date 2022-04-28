# Grafana JavaScript Agent

Grafana JavaScript Agent is a library that enables applications (both frontend and backend) to interact with external
services like [Grafana](https://grafana.com/grafana/), [Prometheus](https://prometheus.io/),
[Loki](https://grafana.com/logs/), [Tempo](https://grafana.com/traces/) etc.

The repository consists of multiple packages that should be combined depending on the needs, as well as a [demo](https://github.com/grafana/grafana-javascript-agent/tree/main/demo)
which can be ran by following the [README.md file](https://github.com/grafana/grafana-javascript-agent/tree/main/demo/README.md).

## Packages

### Core

[@grafana/agent-core](https://github.com/grafana/grafana-javascript-agent/tree/main/packages/core) is the
main package that provides the core functionality of the agent. The [README.md](https://github.com/grafana/grafana-javascript-agent/tree/main/packages/core/README.md)
file provides an overview of the architecture and the API of library.

### Web

[@grafana/agent-web](https://github.com/grafana/grafana-javascript-agent/tree/main/packages/web) provides instrumentations, metas and transports for use in web applications. See The [README.md](https://github.com/grafana/grafana-javascript-agent/tree/main/packages/web/README.md) for more information.

### Web-tracing

[@grafana/agent-web-tracing](https://github.com/grafana/grafana-javascript-agent/tree/main/packages/web-tracing) provides implementation for tracing web applications. See The [README.md](https://github.com/grafana/grafana-javascript-agent/tree/main/packages/web-tracing/README.md) for more information.


### Integrations

1. [@grafana/agent-integration-angular](https://github.com/grafana/grafana-javascript-agent/tree/main/packages/integration-angular)
   is a package that enables easier integration in projects built with Angular. FOR THE TIME BEING
   THIS PACKAGE IS A PLACEHOLDER.
1. [@grafana/agent-integration-react](https://github.com/grafana/grafana-javascript-agent/tree/main/packages/transport-fetch)
   is a package that enables easier integration in projects built with React. FOR THE TIME BEING
   THIS PACKAGE IS A PLACEHOLDER.
