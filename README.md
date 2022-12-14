# Grafana Faro Web SDK

[![Build Status][faro-drone-status]][faro-drone]

<p align="left"><img src="docs/faro_logo.png" alt="Grafana Faro logo" width="400"></p>

The Grafana Faro Web SDK can instrument frontend JavaScript applications to collect telemetry and forward it to the
[Grafana Agent][grafana-agent-docs] (with app agent receiver integration enabled). Grafana Agent can then send this data
to [Loki][grafana-logs] or [Tempo][grafana-traces].

The repository consists of multiple packages that can be combined depending on your requirements, as well as a
[demo][faro-demo], which can be run by following the [README.md file][faro-demo-readme].

## Get started

See [quick start for web applications][faro-quick-start].

## Packages

### Core

[@grafana/faro-core][faro-core] is the main package that provides the core functionality of the SDK. The
[README.md][faro-core-readme] file provides an overview of the architecture and the API of library.

### Web SDK

[@grafana/faro-web-sdk][faro-web-sdk] provides instrumentations, metas and transports for use in web applications. See
the [README.md][faro-web-sdk-readme] for more information.

### Web Tracing

[@grafana/faro-web-tracing][faro-web-tracing] provides implementation for tracing web applications. See the
[README.md][faro-web-tracing-readme] for more information.

### React Support

[@grafana/faro-react][faro-react] is a package that enables easier integration in projects built with React. See the
[README.md][faro-react-readme] for more information.

[faro-drone]: https://drone.grafana.net/grafana/faro-web-sdk
[faro-drone-status]: https://drone.grafana.net/api/badges/grafana/faro-web-sdk/status.svg
[grafana-agent-docs]: https://grafana.com/docs/agent/latest/
[grafana-logs]: https://grafana.com/logs/
[grafana-traces]: https://grafana.com/traces/
[faro-core]: ./packages/core
[faro-core-readme]: ./packages/core/README.md
[faro-demo]: ./demo
[faro-demo-readme]: ./demo/README.md
[faro-quick-start]: ./docs/sources/tutorials/quick-start-browser.md
[faro-react]: ./packages/react
[faro-react-readme]: ./packages/react/README.md
[faro-web-sdk]: ./packages/web-sdk
[faro-web-sdk-readme]: ./packages/web-sdk/README.md
[faro-web-tracing]: ./packages/web-tracing
[faro-web-tracing-readme]: ./packages/web-tracing/README.md
