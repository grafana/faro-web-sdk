# Grafana Faro Web SDK

[![Build Status](https://drone.grafana.net/api/badges/grafana/faro-web-sdk/status.svg)](https://drone.grafana.net/grafana/faro-web-sdk)

<p align="left"><img src="docs/faro_logo.png" alt="Grafana Faro logo" width="400"></p>

The Grafana Faro Web SDK can instrument frontend JavaScript applications to collect 
telemetry and forward it to the [Grafana Agent](https://grafana.com/docs/agent/latest/) 
(with app agent receiver integration enabled).
Grafana Agent can then send this data to 
[Loki](https://grafana.com/logs/) or [Tempo](https://grafana.com/traces/).

The repository consists of multiple packages that can be combined depending on your requirements,
as well as a [demo](https://github.com/grafana/faro-web-sdk/tree/main/demo),
which can be run by following the [README.md file](https://github.com/grafana/faro-web-sdk/tree/main/demo/README.md).

## Get started

See [quick start for web applications](https://github.com/grafana/faro-web-sdk/blob/main/docs/sources/tutorials/quick-start-browser.md).

## Packages

### Core

[@grafana/faro-core](https://github.com/grafana/faro-web-sdk/tree/main/packages/core) is the
main package that provides the core functionality of the SDK. The [README.md](https://github.com/grafana/faro-web-sdk/tree/main/packages/core/README.md)
file provides an overview of the architecture and the API of library.

### Web

[@grafana/faro-web-sdk](https://github.com/grafana/faro-web-sdk/tree/main/packages/web)
provides instrumentations, metas and transports for use in web applications.
See The [README.md](https://github.com/grafana/faro-web-sdk/tree/main/packages/web/README.md) for more information.

### Tracing-web

[@grafana/faro-web-tracing](https://github.com/grafana/faro-web-sdk/tree/main/packages/web-tracing)
provides implementation for tracing web applications.
See The [README.md](https://github.com/grafana/faro-web-sdk/tree/main/packages/web-tracing/README.md)
for more information.

### Integrations

1. [@grafana/faro-angular](https://github.com/grafana/faro-web-sdk/tree/main/packages/angular)
   is a package that enables easier integration in projects built with Angular. FOR THE TIME BEING
   THIS PACKAGE IS A PLACEHOLDER.
1. [@grafana/faro-react](https://github.com/grafana/faro-web-sdk/tree/main/packages/transport-fetch)
   is a package that enables easier integration in projects built with React.
