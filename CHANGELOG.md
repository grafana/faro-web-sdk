# Changelog

## 0.4.0 (2022-06-30)

- Added `agent.pause()` and `agent.unpause()` to be able to temporarily stop
  ingesting events.

## 0.3.0 (2022-06-16)

- Updated build: packages will be published with a build targeting es5 with common-js modules,
  and a build targeting es6 with ecmascript modules.
- `agent.api.pushError` method to push `Error` objects directly

## 0.2.0 (2022-06-03)

- Open Telemetry tracing integration via `@grafana/agent-tracing-web`
- Option to filter errors using `ignoreErrors` configuration option
- Simplified `initializeAgent()` method specifically for web apps in `@grafana/agent-web`

## 0.1.2 - 0.1.6

- Messing about with CI/CD :-)

## 0.1.1 (2022-05-06)

- Update readme for core and web packages with relevant info

## 0.1.0 (2022-05-06)

- Initial development version
