# Grafana JavaScript Agent

**DEPRECATED** _Project has been moved to [Faro Web SDK](https://github.com/grafana/faro-web-sdk)_

[![Build Status](https://drone.grafana.net/api/badges/grafana/grafana-javascript-agent/status.svg)](https://drone.grafana.net/grafana/grafana-javascript-agent)

_Warning_
This feature is currently pre-release and subject to frequent breaking changes.

Grafana JavaScript Agent is a library that can instrument frontend JavaScript applications to collect
telemetry and forward it to the [Grafana Agent](https://grafana.com/docs/agent/latest/)
(with app agent receiver integration enabled). We are also planning to implement this for backend JavaScript applications.
Grafana Agent can then send this data to [Prometheus](https://prometheus.io/),
[Loki](https://grafana.com/logs/), or [Tempo](https://grafana.com/traces/).

The repository consists of multiple packages that can be combined depending on your requirements,
as well as a [demo](https://github.com/grafana/grafana-javascript-agent/tree/main/demo),
which can be run by following the [README.md file](https://github.com/grafana/grafana-javascript-agent/tree/main/demo/README.md).

## Get started

See [quick start for web applications](docs/sources/tutorials/quick-start-browser.md).

## Packages

### Core

[@grafana/agent-core](https://github.com/grafana/grafana-javascript-agent/tree/main/packages/core) is the
main package that provides the core functionality of the agent. The [README.md](https://github.com/grafana/grafana-javascript-agent/tree/main/packages/core/README.md)
file provides an overview of the architecture and the API of library.

### Web

[@grafana/agent-web](https://github.com/grafana/grafana-javascript-agent/tree/main/packages/web)
provides instrumentations, metas and transports for use in web applications.
See The [README.md](https://github.com/grafana/grafana-javascript-agent/tree/main/packages/web/README.md) for more information.

### Tracing-web

[@grafana/agent-tracing-web](https://github.com/grafana/grafana-javascript-agent/tree/main/packages/tracing-web)
provides implementation for tracing web applications.
See The [README.md](https://github.com/grafana/grafana-javascript-agent/tree/main/packages/tracing-web/README.md)
for more information.

### Integrations

1. [@grafana/agent-integration-angular](https://github.com/grafana/grafana-javascript-agent/tree/main/packages/integration-angular)
   is a package that enables easier integration in projects built with Angular. FOR THE TIME BEING
   THIS PACKAGE IS A PLACEHOLDER.
1. [@grafana/agent-integration-react](https://github.com/grafana/grafana-javascript-agent/tree/main/packages/transport-fetch)
   is a package that enables easier integration in projects built with React. FOR THE TIME BEING
   THIS PACKAGE IS A PLACEHOLDER.
