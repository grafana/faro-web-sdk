# Changelog

## Next

- Chore (`@grafana/faro-*`): set default node version to lts/jod

### Breaking

Breaking changes coming with Faro version 2

- **`@grafana/faro-web-tracing`**
  - Removed the deprecated `FaroSessionSpanProcessor` which is replaced by the
    `FaroMetaAttributesSpanProcessor`. While `FaroSessionSpanProcessor` wasn't used anymore,
    it was kept for users using it in manual Faro + OTel setups.
  - Removed the deprecated `session_id` attribute in favor of `session.id`.

- **`@grafana/faro-web-sdk`**
  - Removed deprecated console instrumentation config options. Configure the instrumentation through
    global Faro options as documented in [How to use the console instrumentation](https://grafana.com/docs/grafana-cloud/monitor-applications/frontend-observability/instrument/console-instrumentation/#how-to-use-the-console-instrumentation).
  - Removed the internal deprecated Faro conventions names object. If you were using this export,
    the names are now available through individual constant exports.
  - **Experimental packages**:
    Removed the `instrumentation-fetch`, `instrumentation-xhr`, and `instrumentation-performance-timeline`
    packages due to lack of maintenance. These packages remain available on NPM but are flagged as deprecated.

## 1.19.0

- Feature (`@grafana/faro-web-sdk`): Add CSP instrumentation (#1312)

- Improvement (`@grafana/faro-*`): Rename `userActionEventType` to `userActionTrigger` for improved clarity (#1298)

- Chore (`@grafana/faro-web-sdk`): Prevent tracking of custom collector URLs that don't match the Faro collector
  URL structure (#1297)
- Chore (`@grafana/faro-core`): Ensure first instrumentation gets properly removed (#1312)
- Chore (`@grafana/faro-*`): Remove Node.js 23 from build and test matrix as it's EoL (#1343)
- Chore (`@grafana/faro-*`): upgrade to yarn 4

## 1.18.2

- Improvement (`@grafana/faro-web-sdk`): don't attach user action context to http request when in halt mode (#1249)

- Chore (`@grafana/faro-*`): Updated Node.js version support by removing Node.js 18 (EOL) and adding Node.js 24
  LTS (#1259).

## 1.18.1

- Chore (`@grafana/faro-*`): Revert "Changed Node.js version support by removing Node.js 18 because it is EOL" (#1195).

## 1.18.0

- Improvement (`@grafana/faro-web-sdk`): Track transfer size for resource requests
  (#1169).

- Fix (`@grafana/faro-web-sdk`): Fixed the ignored errors matching logic to properly identify
  errors based on stack trace content (#1168).

- Chore(deps): Changed Node.js version support by removing Node.js 18 because it is EOL (#1180).

## 1.17.2

- Fix (`@grafana/faro-web-sdk`): Fixed incorrect calculation of TLS negotiation time in
  performance metrics (#1156).

- Improvement (`@grafana/faro-web-sdk`): Prevent negative values in performance timing measurements
  (#1154).

## 1.17.1

- Fix (`@grafana/faro-web-tracing`): Fixed an issue with HTTP request sidecar events not being
  transmitted when using the CDN distribution (#1139).

- Fix (`@grafana/faro-react`): Export the `ExceptionEventExtended` type from the package, allowing
  users to import all necessary types from a single source (#1141).

## 1.17.0

- Feature (`@grafana/faro-web-sdk`): Add option to preserve original JavaScript error objects,
  making them accessible within the `beforeSend` function for advanced error handling (#1133).
- Improvement (`@grafana/faro-web-sdk`): Enhanced web vitals monitoring by automatically tracking
  attribution data by default (#991).

## 1.16.0

- Improvement (`@grafana/faro-web-sdk`): Provide a function to start a user-action (#1115).
- Dependencies (`@grafana/faro-*`): Upgrade OpenTelemetry dependencies to v0.200.\* (#1126).

## 1.15.0

- Feature (`@grafana/faro-web-sdk`): Alpha version of user actions instrumentation (#1101).

- Fix (`@grafana/faro-web-tracing`): Fixed unexpected behavior in xhr instrumentation when custom
  objects with a `toString` method were used as URLs (#1100).

- Dependencies (`@grafana/faro-*`): Upgrade to TypeScript 5.8.2 (#1092)

## 1.14.3

- Improvement (`@grafana/faro-core`): Avoid sending empty `attributes` or `context` objects
  when no data is provided (#1089)

## 1.14.1

- Improvement (`@grafana/faro-web-sdk`): The ignored errors parser now also parses stack traces.
  This is helpful, for example, to exclude all errors thrown by extensions (#1000).

## 1.14.0

- Feature (`@grafana/faro-web-sdk`): Provide a `webVitalsInstrumentation.reportAllChanges` option to report
  all changes for web vitals (#981)
- Feature (`@grafana/faro-web-sdk`): Enhance user meta properties to align with OTEL semantic
  conventions for user attributes (#990)
- Feature (`@grafana/faro-web-tracing`): Add user attributes to spans (#990)

### Breaking

- Improvement (`@grafana/faro-web-tracing`): Removed `@opentelemetry/context-zone` as it is not
  required for the default instrumentations.

  Users who need `ZoneContextManager` for additional OTEL instrumentations can inject it via the
  web-tracing configuration.

  ```ts
  initializeFaro({
    // ...
    instrumentations: [
      // ...
      new TracingInstrumentation({
        contextManager: new ZoneContextManager(),
        instrumentations: [
          /* custom instruments */
        ],
      }),
    ],
    // ...
  });
  ```

## 1.13.3

- Chore (`@grafana/faro-web-sdk`): Ensure all properties in `attributes` and `context` objects are
  stringified when sending custom signals (#952)

## 1.13.2

- Fix (`@grafana/faro-web-sdk`): The optional context object in the `pushError` API now correctly
  stringifies all provided values (#944)

## 1.13.1

- Fix (`@grafana/faro-web-sdk`): Corrected the `setPage()` API to update the `page.id` properly and
  correctly merge with the active page metadata (#933)

## 1.13.0

- Feature (`@grafana/faro-web-sdk`): Provide APIs to send `service.name` override instructions to the
  receiver (#893)
- Feature (`@grafana/faro-web-sdk`): Introduced `setPage(meta)` API to overwrite page metadata and
  added an option to inject a custom `pageId` parser for generating custom `pageId`s continuously
  (#923)
- Feature (`@grafana/faro-web-sdk`): Enables support to provide a custom serializer for console
  error properties (#901)

- Improvement (`@grafana/faro-web-sdk`): Send an event for `service.name` overrides (#903)
- Improvement (`@grafana/faro-*`) Add required Node engines to package.json (#913)

- Fix (`faro demo`): Add missing json files to Docker image (#925).

## 1.12.3

- Feat (`@grafana/faro-web-tracing`): add duration to events from traces (#861)
- Fix (`@grafana/faro-transport-otlp-http [experimental]`): Prevent sending requests when the
  endpoint URL is not configured (#827).
- Dependencies (`@grafana/faro-web-tracing`): upgrade otel deps (#763)

## 1.12.2

- Fix (`@grafana/faro-web-sdk`): Update Faro log parsing in console instrumentation to use Faro's
  default log parser (#745)

## 1.12.1

- Fix (`@grafana/faro-web-sdk`): Guard console instrumentation stringifier against circular object
  references for non-error logs (#742)

## 1.12.0

- Fix (`@grafana/faro-web-sdk`): Guard user session stringifier against circular object references (#715)
- Fix (`@grafana/faro-web-sdk`): Prevents circular references in objects sent via `console.error`
  messages (#730)

- Refactor (`@grafana/faro-web-sdk`): Provide config option to send log messages for console.error
  calls (#731)

- Feat (`@grafana/faro-web-sdk`): Provide a `getIgnoreUrls()` function to easily retrieve the
  configured ignoreUrls (#732)

## 1.11.0

- Improvement (`@grafana/faro-web-sdk`): The console instrumentation now sends an `Error` signal
  instead of a `Log` signal for `console.error()` calls (#703).
- Improvement (`@grafana/faro-web-sdk`): The resource timings instrumentation now includes `ttfb`
  (Time to First Byte) and `visibilityState` in `faro.performance.resource` timings (#708).
- Deps (`@grafana/faro-*`): Minor dependency updates.

## 1.10.2

- Fix (`@grafana/faro-web-tracing`): Enhance the xhr instrumentation to handle both URL objects and
  strings seamlessly (#695).

## 1.10.1

- Improvement (`@grafana/faro-web-sdk`): Isolated Faro instances now exclude the default collector
  URLs of other instances by default (#684).
- Improvement (`@grafana/faro-web-sdk`): The `pushError` API now automatically includes `error.cause`
  in the Faro exception context (#688).

- Fix (`@grafana/faro-transport-otlp-http [experimental]`): add `service.namespace` attribute if set
  (#687).

### Breaking

- Improvement (`@grafana/faro-transport-otlp-http [experimental]`): update semantic attributes
  for browser (#684).
  - `browser.user_agent` is replaced by `user_agent.original`
  - `browser.os` is replaced by `browser.platform`

## 1.10.0

- Improvement (`@grafana/faro-web-sdk`): don't automatically send a `view_change` event for the default
  view (#647)

- Dependencies (`@grafana/faro-web-tracing`): upgrade otel deps (#670)
  - Note: some attributes have been changed due to otel semantic attributes spec or are now aligned
    with it. For the web-tracing package we provide both attribute versions for now:
    - `deployment.environment` is now deprecated and will be replaced by
      `deployment.environment.name`.
    - `session_id` is now deprecated and will be replaced by `session.id`
- Dependencies (`@grafana/faro-core`): upgrade otel deps (#670).

### Breaking

- Dependencies (`@grafana/faro-transport-otlp-http [experimental]`): upgrade otel deps (#670)
  - Note: some attributes have been changed due to otel semantic attributes spec:
    - `enduser.id` is replaced by `user.id`
    - `enduser.name` is replaced by `user.username`,
    - `enduser.email` is replaced by `user.email`,
    - `enduser.attributes` is replaced by `user.attributes`,
    - `http.url` is replaced by `url.full`
    - `deployment.environment` is replaced by `deployment.environment.name`

## 1.9.1

- Fix (`@grafana/faro-transport-otlp-http [experimental]`): Properly consume response body (#664).

## 1.9.0

- Improvement (`@grafana/faro-web-sdk`): Provide and option to pass a correction timestamp via the
  Faro API (#658).

- Fix (`@grafana/faro-web-sdk`): Adjust the timestamp of a navigation or resource event to reflect
  the actual time the event occurred, rather than the signal creation time. (#658).

- Improvement: (`@grafana/faro-web-tracing`) The underlying XHR and Fetch instrumentation are now
  configured to ignore network events by default. This behavior can be enabled back through the
  options in the WebTracing class.

## 1.8.2

- Improvement (`@grafana/faro-web-tracing`): ensure that span status is always set to error for
  erroneous xhr requests (#644).

## 1.8.1

- Improvement (`@grafana/faro-web-tracing`): ensure that span status is always set to error for
  erroneous fetch requests (#641).

## 1.8.0

- Feature (`@grafana/faro-web-sdk`): track `web vitals` attribution (#595).
- Feature (`@grafana/faro-web-sdk`): set span context for navigation events (#608).
- Feature (`@grafana/faro-react`): add helper functions to initialize React Router integration (#622).

- Improvement (`@grafana/faro-web-sdk`): Auto extend a session if the Faro receiver indicates that a
  session is invalid (#591).
- Improvement (`@grafana/faro-web-tracing`): provide the `app.namespace` attribute in the app meta
  which is attached as `service.namespace` to the resource attributes object (#627).

- Dependencies (`@grafana/faro-web-tracing`): upgrade otel deps (#621).
- Dependencies (`@grafana/faro-core`): upgrade otel deps (#621).
- Dependencies (`@grafana/faro-transport-otlp-http [experimental]`): upgrade otel deps (#621).

- Fix (`@grafana/faro-react`): Mark `react-router-dom` peer dependency as optional (#617).

## 1.7.3

- Feature (`@grafana/faro-core`): source map uploads - add `bundleId` to the `MetaApp` `Meta` object
  (#476).
- Feature (`@grafana/faro-web-sdk`): track window dimensions via the `browser meta` (#594).
- Feature (`@grafana/faro-web-sdk`): If `logArgsSerializer` is set in the config
  of `initializeFaro`, it will be forwarded to the core (#589).

## 1.7.2

- Fix (`@grafana/faro-react`): Fixed a type issue in react v6 router dependencies (#585).

## 1.7.1

- Improvement (`@grafana/faro-core`): Config has now a parameter `logArgsSerializer` to set a custom serializer for
  log arguments (#564). This is useful if log message args are complex and might produce `[object Object]` in the logs.
- Fix (`@grafana/faro-web-tracing`): Fix an import issue causing builds to fail (#581).
- Fix (`@grafana/faro-react`): Fix type issues in react data route wrapper `withFaroRouterInstrumentation` (#584).

## 1.7.0

- Improvement (`@grafana/faro-web-sdk`): provide option to globally
  exclude endpoint URLs from being tracked. This applies to the following instrumentations:
  performance, xhr, fetch and web-tracing (#554).
- Update (`faro demo`): Update Demo to pin docker images and replace Cortex by Mimir (#563).
- Improvement (`faro demo`): Migrate demo Grafana agent to Grafana alloy

## 1.6.0

- Docs(`@grafana/faro-web-sdk`, `@grafana/faro-web-tracing`): Remove pre-release warning (#550).
- Improvement (`@grafana/faro-web-tracing`): Remove redundant DocumentLoadInstrumentation.
  Faro tracks page load data by default (#551).
- Improvement(`@grafana/faro-web-sdk`): Performance instrumentation only tracks resource entries initiated
  by calls to the `fetch` method or `xhr-html requests`. To track all resource entries set
  `trackResources: true` (#560).

## 1.5.1

- Feature(`@grafana/faro-web-sdk`): Add parsing time to FaroNavigationTiming (#541).
- Improvement ()(`@grafana/faro-web-sdk`): Get rid of structureClone. It caused breakage in some
  sandboxed environments because of injected proxy objects (#536).
- Feat(`@grafana/faro-web-sdk`): Add K6 test ID to K6 meta if available in window.k6 object (#531).

## 1.5.0

- Feat(`@grafana/faro-web-sdk`): Add responseStatus to performance events (#526).
- Fix (`@grafana/faro-web-sdk`): Faro updates sessions in an infinite loop if DOM Storage is not
  available (#519).
- Feat (`@grafana/faro-react`): Support instrumenting React Router v6 data routers (#518).

## 1.4.2

- Fix (`@grafana/faro-web-sdk`): Session started timestamp was reset on page-loads (#513).
- Fix (`@grafana/faro-web-tracing`): `faro.trace.*` attached spanContext from active span instead of
  the respective child span (#510).
- Feat (`@grafana/faro-web-sdk`): Faro APIs now support adding a custom traceId and spanId to
  signals (#510).

## 1.4.1

- Improvement (`@grafana/faro-web-tracing`): Dedupe Faro trace events (#507).

## 1.4.0

- Feat (`@grafana/faro-web-sdk`): Enable Faro Navigation and Resource timings instrumentation by default (#482).
- Improvement (`@grafana/faro-web-tracing`): Send a dedicated Faro event for traces of kind=client (#499).

## 1.3.9

- Improvement (`@grafana/faro-web-sdk`): add `duration` property in `faro.performance.resource` timings and
  rename property `totalNavigationTime` to `duration` in `faro.performance.navigation` timings (#490).
- Fix (`@grafana/faro-web-sdk`): crash when navigator.userAgentData is undefined (#494).

## 1.3.8

- Deps (`@grafana/faro-web-tracing`, `@grafana/faro-core`): Update OpenTelemetry dependencies (#475).

## 1.3.7

- Improvement (`@grafana/faro-web-sdk`): add response time to performance timings (#465).
- Deps (`@grafana/faro-web-tracing`): Update `instrumentation-document-load` which prevents build.
  from breaking (#467).

## 1.3.6

- Feature preview (`@grafana/faro-web-sdk`): instrument navigation and resource timings. As long as
  this feature is in preview it is disabled by default (#434)
- Improvement (`@grafana/faro-web-tracing`): Automatically add the value of the MetaApp environment
  property to the resource attributes `deployment.environment` property (#453)
- Improvement (`@grafana/faro-web-sdk`): change storage key prefix for Faro session to use reverse domain
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
- Improvement: Send better attributes with the view and route transition events to contain information about
  the previous route or view (`from*`) and the destination route or view (`to*`) (#397).
- Breaking❗️: React Instrumentation, the route transition event is renamed from `routeChange` to
  `route_change`. The `url` and `route` attributes sent with the event are renamed to `toRoute` and
  `toUrl`.(#397).

## 1.2.8

- Improvement: Custom x-faro-session-id header will now be added to legacy sessions as well (#384).
- Improvement: Lower maxSessionPersistenceTime for tracked sessions and export tooling to make it easier
  to manually remove a persisted session (#387)

## 1.2.7

- Hotfix: disable custom x-faro-session-id header for legacy sessions (#383)

## 1.2.6

- Feat: Add x-faro-session header to identify client session id to server
  for fetch and xhr instrumentations (#377)
- Improvement (): Always send x-faro-session-id header, independent of the chosen session management (#381).
- Improvement: If new session management is used, send dedicated session lifecycle events to reflect if a
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
