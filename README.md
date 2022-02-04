# Grafana JavaScript Agent

Grafana JavaScript Agent is a library that enables applications (both frontend and backend) to interact with external
services like [Grafana](https://grafana.com/grafana/), [Prometheus](https://prometheus.io/), [Loki](https://grafana.com/logs/),
[Tempo](https://grafana.com/traces/) etc.

The repository consists of multiple packages that should be combined depending on the needs, as well as a [demo](https://github.com/grafana/grafana-javascript-agent/tree/main/demo)
which can be ran by following the [README.md file](https://github.com/grafana/grafana-javascript-agent/tree/main/demo/README.md).

---

## Packages

### Core

[@grafana/javascript-agent-core](https://github.com/grafana/grafana-javascript-agent/tree/main/packages/core) is the
main package that provides the core functionality of the agent. The [README.md](https://github.com/grafana/grafana-javascript-agent/tree/main/packages/core/README.md)
file provides an overview of the architecture and the API of library.

### Plugins

Official plugins:

#### Functionality

1. [@grafana/javascript-agent-plugin-console](https://github.com/grafana/grafana-javascript-agent/tree/main/packages/plugin-console)
   is a plugin for both, browsers and Node.js, which provides an automatic mechanism for collecting console events.
1. [@grafana/javascript-agent-plugin-errors](https://github.com/grafana/grafana-javascript-agent/tree/main/packages/plugin-errors)
   is a plugin for both, browsers and Node.js, which provides an automatic mechanism for collecting unhandled
   exceptions and errors.
1. [@grafana/javascript-agent-plugin-web-vitals](https://github.com/grafana/grafana-javascript-agent/tree/main/packages/plugin-web-vitals)
   is a browser plugin which collects [web vitals](https://web.dev/vitals/) metrics from the app.

#### Meta

1. [@grafana/javascript-agent-plugin-browser-meta](https://github.com/grafana/grafana-javascript-agent/tree/main/packages/plugin-browser-meta)
   is a browser plugin for collecting details about the browser, operating system and device type.
1. [@grafana/javascript-agent-plugin-page-meta](https://github.com/grafana/grafana-javascript-agent/tree/main/packages/plugin-page-meta)
   is a browser plugin for collecting details about the current page (i.e. the URL, page title etc.).
