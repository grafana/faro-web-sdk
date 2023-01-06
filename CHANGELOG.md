# Changelog

## 1.0.0-beta6

- **Breaking change** Instrumentations and transports no longer receive a `faro` instance and they should not rely on
  the global `faro` instance as it would break the isolation mode. Various APIs are passed individually (i.e.
  `this.api` vs `this.faro.api`, `this.unpatchedConsole` vs `this.faro.unpatchedConsole`)
- Remove internal references to global Faro object

## 1.0.0-beta5

- Remove type module from package.json in web-tracing package

## 1.0.0-beta4

- Add support for CDN
- Updated dependencies
- Boilerplate updates
- Improve final build

## 1.0.0-beta3

- **Breaking change** No longer supports sending traces to Grafana Agent < 0.29.0.
- Fix bug where if multiple instances of a transport class where configured, only one would be used
- Added `EventAttributes` export
- Updated dependencies
- Enabled inline source maps

## 1.0.0.beta1, 1.0.0.beta2 (2022-10-31)

- Rename to "Faro Web SDK"

## 0.5.0 (2022-10-25)

- Added basic session tracking: web SDK automatically creates new session id when agent is initialized.
  `SessionInstrumentation` that sends `session_start` event on initialization or when new session is set.
  `SessionProcessor` for OTel that will add `session_id` attribute to every span if available.
- Added `agent.api.pushEvent` method for capturing RUM events.
- `FetchTransport` will back off after receiving 429 Too Many Requests response. Events will be dropped during backoff period.
  Backoff period respects `Retry-After` header if present.
- Limit the number of spans sent by OpenTelemetry at once to 30.
- Updated dependencies.
- React basic instrumentation via `@grafana/agent-integration-react`.
- Added a deduplication filter to prevent same message being reported multiple times.
- Added debugging features to the agent.
- `initializeAgent` was renamed to `initializeGrafanaAgent`.
- Re-export everything from `@grafana/agent-core` to `@grafana/agent-web` and `@grafana/agent-integration-react`.
- Prevent multiple global instances of the agent from running at the same time.

## 0.4.0 (2022-06-30)

- Added `agent.pause()` and `agent.unpause()` to be able to temporarily stop.
  ingesting events.

## 0.3.0 (2022-06-16)

- Updated build: packages will be published with a build targeting es5 with common-js modules, and a build targeting
  ES6 with ECMAScript modules.
- `agent.api.pushError` method to push `Error` objects directly.

## 0.2.0 (2022-06-03)

- Open Telemetry tracing integration via `@grafana/agent-tracing-web`.
- Option to filter errors using `ignoreErrors` configuration option.
- Simplified `initializeAgent()` method specifically for web apps in `@grafana/agent-web`.

## 0.1.2 - 0.1.6

- Messing about with CI/CD :-).

## 0.1.1 (2022-05-06)

- Update readme for core and web packages with relevant info.

## 0.1.0 (2022-05-06)

- Initial development version.
