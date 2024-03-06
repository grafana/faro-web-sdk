# Changelog

## Next

## 1.4.2

- Fix (`@grafana/faro-web-sdk`): Session started timestamp was reset on page-loads (#513).
- Fix (`@grafana/faro-web-tracing`): `faro.trace.*` attached spanContext from active span instead of
  the respective child span (#510).
- Feat (`@grafana/faro-web-sdk`): Faro APIs now support to add a custom traceId (#510).

## 1.4.1

- Enhancement (`@grafana/faro-web-tracing`): Dedupe Faro trace events (#507).

## 1.4.0

- Feat (`@grafana/faro-web-sdk`): Enable Faro Navigation and Resource timings instrumentation by default (#482).
- Enhancement (`@grafana/faro-web-tracing`): Send a dedicated Faro event for traces of kind=client (#499).

## 1.3.9

- Enhancement (`@grafana/faro-web-sdk`): add `duration` property in `faro.performance.resource` timings and
  rename property `totalNavigationTime` to `duration` in `faro.performance.navigation` timings (#490).
- Fix (`@grafana/faro-web-sdk`): crash when navigator.userAgentData is undefined (#494).

## 1.3.8

- Deps (`@grafana/faro-web-tracing`, `@grafana/faro-core`): Update OpenTelemetry dependencies (#475).

## 1.3.7

- Enhancement (`@grafana/faro-web-sdk`): add response time to performance timings (#465).
- Deps (`@grafana/faro-web-tracing`): Update `instrumentation-document-load` which prevents build.
  from breaking (#467).

## 1.3.6

- Feature preview (`@grafana/faro-web-sdk`): instrument navigation and resource timings. As long as
  this feature is in preview it is disabled by default (#434)
- Enhancement (`@grafana/faro-web-tracing`): Automatically add the value of the MetaApp environment
  property to the resource attributes `deployment.environment` property (#453)
- Change (`@grafana/faro-web-sdk`): change storage key prefix for Faro session to use reverse domain
  notation (#432)
- Fix (`@grafana/faro-core`): make check for presence of Event more robust (#436)

## 1.3.5

- Fix (`@grafana/faro-web-sdk`): Multiple session_extend events were emitted if multiple
  browsing contexts were open when a session was auto-extended (#428)
- Fix (`@grafana/faro-web-sdk`): guard against missing `isSampled` (#425)

## 1.3.4

- Fix (`@grafana/faro-web-sdk`): `generateSessionId()` was executed twice (#423)

## 1.3.3

- Fix (`@grafana/faro-web-sdk`): user defined session attributes added during initialize were not
  picked up (#420)
- Feat (`@grafana/faro-web-sdk`): provide custom `generateSessionId()` function which Faro will use
  instead of the internal sessionId generator if configured (#421).

## 1.3.2

- Fix (`@grafana/faro-web-sdk`): Fixed an issue where the session meta was missing in session
  lifecyle events sent during the init phase (#417).

## 1.3.1

- Fix (`@grafana/faro-web-sdk`): Fixed an issue where the first calculated session was always part of the sample (#415).

## 1.3.0

- Deps (`@grafana/faro-react`): add missing peer dependency on `react-dom` (#400).
- Deps (`@grafana/faro-core`): remove unused `@opentelemetry/api-metrics` dependency (#401).
- Deps (`@grafana/faro-web-tracing`): remove unused `@opentelemetry/sdk-trace-base` dependency (#401).
- Fix (`@grafana/faro-web-sdk`): fixed a issue where session based sampling combined with batched mode
  lead to dropped items, even if they were part of the sample (#402).
- Fix (`@grafana/faro-web-sdk`): Cleanup up session meta before sending it to not include Faro specific
  attributes (#408).
- Breaking❗️ (`@grafana/faro-web-sdk`): The new volatile session manager is enabled by default. The
  old legacy session object is removed. This change is only breaking if you customized the old default
  session management (#412).

## 1.2.9

- Deps: upgrade OTEL dependencies, remove outdated resolutions (#391).
- Fix (Web Tracing): send otel timings, like timeUnixNano, as string instead in LongBits format (#391).
- Feat: session based sampling (#385).
- Change: Send better attributes with the view and route transition events to contain information about
  the previous route or view (`from*`) and the destination route or view (`to*`) (#397).
- Breaking❗️: React Instrumentation, the route transition event is renamed from `routeChange` to
  `route_change`. The `url` and `route` attributes sent with the event are renamed to `toRoute` and
  `toUrl`.(#397).

## 1.2.8

- Change: Custom x-faro-session-id header will now be added to legacy sessions as well (#384).
- Change: Lower maxSessionPersistenceTime for tracked sessions and export tooling to make it easier
  to manually remove a persisted session (#387)

## 1.2.7

- Hotfix: disable custom x-faro-session-id header for legacy sessions (#383)

## 1.2.6

- Feat: Add x-faro-session header to identify client session id to server
  for fetch and xhr instrumentations (#377)
- Chore: Always send x-faro-session-id header, independent of the chosen session management (#381).
- Change: If new session management is used, send dedicated session lifecycle events to reflect if a
  new session is started, a session is resume or extended (#380)

## 1.2.5

- Feat: New session tracking capabilities (optional, disabled by default) where users can choose to
  use tracked or volatile sessions (#374).

## 1.2.4

- Breaking: The sdk meta now only contains the version number of Faro. This is to reduce beacon payload size.
  [If users need the full data including all integrations, it can be added as outlined in the docs.](https://github.com/grafana/faro-web-sdk/blob/adda57314381c7d945d8647eee2841d173571281/docs/sources/developer/architecture/components/metas.md#L52)(#370)
- Feature: new experimental session manager which can be configured to use persistent or volatile
  sessions (#359).
- Fix: user provided session attributes were not sent (#372).

## 1.2.3

- Fix: Disable keepalive in web-sdk fetch transport when the payload length is over 60_000 (#353).
- Fix: Add 'isK6Browser' field to k6 meta object (#361).

## 1.2.0 - 1.2.2

- Feat: Detect if Faro is running inside K6 browser to distinguish between lab and field data (#263).
- Feat: Enable users to configure per-error boundary `pushError` behavior.
- Deps: Upgrade project to use the current Node LTS version (lts/hydrogen, v18)
- Deps: Dependency updates
- Deps: CVE-2023-45133 - Babel vulnerable to arbitrary code execution when compiling specifically
  crafted malicious code

## 1.2.0

- Feat: Enable users to add contextual attributes to measurement API payload ([#254](https://github.com/grafana/faro-web-sdk/issues/254))

## 1.1.4

- Fix: CVE-2022-25878 - protobufjs Prototype Pollution vulnerability (#249)

## 1.1.3

- Fix: Update opentelemetry packages used by the Web-Tracing-Instrumentation to address
  [CVE-2023-38704](https://nvd.nist.gov/vuln/detail/CVE-2023-38704)
  ([#242](https://github.com/grafana/faro-web-sdk/pull/242))

## 1.1.2

- Fix: fix CVE-2023-32731 by forcing all dependencies to use grpc-js ^1.8.17.

## 1.1.1

- Remove: Remove OTel user-interaction instrumentation from the default set (#215)

## 1.1.0

- Add: add option to provide additional error context in `pushError` api.
- Fix: Use `globalThis` instead of `global` or `window` in case the SDK is used in webworkers.
- Add: Add batch execution support for transports in core.
- Add: Transport.send now accepts a list of items to be sent instead of a single item.
- Update: Update Vite version in Demo app
- Add: Experimental instrumentation package for fetch

## 1.0.3 - 1.0.5

- Add: Config option to include URLs for which requests shall have tracing headers added.
- Fix: TracingInstrumentation broke fetch requests with relative URLs are broken on sub-pages.
- Fix: Missing destructuring assignment in Browser quick start tutorial.
- Fix: Demo app crashes when user has an ad-blocker activated.

## 1.0.1 - 1.0.2

- Have FetchTransport consume response body. Otherwise requests are not considered closed
- Fix a bug where View and Session Instrumentation had wrong version applied
- Use Change to use the new functions names from WebVitals instead of the deprecated ones

## 1.0.0

- Fix circular dependency in the `core` package
- Added export for the `Extension` interface in `core`, `web-sdk` and `react` packages
- Added export for `genShortID` function in `core`, `web-sdk` and `react` packages
- Fixed span timings
- Updated dependencies
- Remove `started` property from `MetaSession` interface

## 1.0.0-beta6

- **Breaking change** Instrumentations and transports no longer receive a `faro` instance and they should not rely on
  the global `faro` instance as it would break the isolation mode. Various APIs are passed individually (i.e.
  `this.api` vs `this.faro.api`, `this.unpatchedConsole` vs `this.faro.unpatchedConsole`)
- Remove internal references to global Faro object
- Add view meta
- Updated dependencies

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
