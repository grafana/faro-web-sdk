# Changelog

## Next

## [2.6.0](https://github.com/grafana/faro-web-sdk/compare/v2.5.0...v2.6.0) (2026-05-08)


### Features

* **ai:** add faro-setup skill for Grafana Cloud web instrumentation ([#1938](https://github.com/grafana/faro-web-sdk/issues/1938)) ([c3f0555](https://github.com/grafana/faro-web-sdk/commit/c3f05556789fe401503d32c1cbd8e7e91daa98a0))
* align with new Faro spec fields (meta.os, meta.device, app.installationId, exception.fatal) ([#1997](https://github.com/grafana/faro-web-sdk/issues/1997)) ([4b369c4](https://github.com/grafana/faro-web-sdk/commit/4b369c4e8a5942ab8bd8acc8514d672904c8b77f))
* **errors:** add fingerprint attribute to exception logs ([#1914](https://github.com/grafana/faro-web-sdk/issues/1914)) ([82e90d1](https://github.com/grafana/faro-web-sdk/commit/82e90d17f66c39e53b32c6cdd31bc3ea420313a7))
* **faro-react:** add React Router v7 config creation helpers ([#1879](https://github.com/grafana/faro-web-sdk/issues/1879)) ([7fd2558](https://github.com/grafana/faro-web-sdk/commit/7fd2558f5f7ffa0fa8af0a75405a017fe650114f))
* **instrumentation-replay:** add experimental replay support ([#1417](https://github.com/grafana/faro-web-sdk/issues/1417)) ([29d090c](https://github.com/grafana/faro-web-sdk/commit/29d090c639bac267f161f908bd54ec4e6f17e65e))
* **instrumentation-replay:** add maskInputFn option for custom input masking ([#1896](https://github.com/grafana/faro-web-sdk/issues/1896)) ([0111756](https://github.com/grafana/faro-web-sdk/commit/0111756f639aa0f7bc56cac698ed1a31eff71196))
* **instrumentation-replay:** make recording conditional on session sampling ([#1876](https://github.com/grafana/faro-web-sdk/issues/1876)) ([59f2629](https://github.com/grafana/faro-web-sdk/commit/59f26295a80493d9ac2bcf1853d0e560920a55a2))
* **instrumentation-replay:** support `recordAfter` option in `@grafana/faro-instrumentation-replay` ([#1886](https://github.com/grafana/faro-web-sdk/issues/1886)) ([4488022](https://github.com/grafana/faro-web-sdk/commit/448802267562e48ebf721c75ec89635b1c273883))
* navigation instrumentation ([#1691](https://github.com/grafana/faro-web-sdk/issues/1691)) ([cbf1aa6](https://github.com/grafana/faro-web-sdk/commit/cbf1aa66dd9d35ee82196d3f08bf84e90c7008c2))
* **replay:** add samplingRate sub-sampling option ([#1919](https://github.com/grafana/faro-web-sdk/issues/1919)) ([05dd580](https://github.com/grafana/faro-web-sdk/commit/05dd580a97dd73367fd73ef0da4da684fc981e37))
* **replay:** adopt privacy-first default masking ([#1926](https://github.com/grafana/faro-web-sdk/issues/1926)) ([5d1179c](https://github.com/grafana/faro-web-sdk/commit/5d1179cdc92f5a8c82f445724e66cfc4a123c447))
* **replay:** emit faro.session_recording.started event on recording start ([#1925](https://github.com/grafana/faro-web-sdk/issues/1925)) ([e5f7659](https://github.com/grafana/faro-web-sdk/commit/e5f7659fea93ce15e22a8cb7ec899635f9d77e25))
* **replay:** pause recording after user inactivity ([#2015](https://github.com/grafana/faro-web-sdk/issues/2015)) ([fedbe7f](https://github.com/grafana/faro-web-sdk/commit/fedbe7ff41c592a7782737ea2200680cf8796800))
* **transport:** support async dynamic headers in FetchTransport ([#1932](https://github.com/grafana/faro-web-sdk/issues/1932)) ([2568fd3](https://github.com/grafana/faro-web-sdk/commit/2568fd3adac5b3f2cc7e60faeb58ec9eaccc8ad2))
* **transport:** support dynamic asynchronous headers in OtlpHttpTransport ([#1955](https://github.com/grafana/faro-web-sdk/issues/1955)) ([4524ef2](https://github.com/grafana/faro-web-sdk/commit/4524ef2b18102713c76e277090f878285fb78ea4))
* **transport:** support dynamic headers in transports ([#1788](https://github.com/grafana/faro-web-sdk/issues/1788)) ([54e6527](https://github.com/grafana/faro-web-sdk/commit/54e6527da5017ef698eef7d90573b68402d690ef))
* update web-vitals to v5 ([#1386](https://github.com/grafana/faro-web-sdk/issues/1386)) ([b8103e8](https://github.com/grafana/faro-web-sdk/commit/b8103e876c4641abd92706f2abe44b3b0a9aeada))
* **user-actions:** add user aciton severity ([#1418](https://github.com/grafana/faro-web-sdk/issues/1418)) ([fbb9bf2](https://github.com/grafana/faro-web-sdk/commit/fbb9bf24ad97a091ee934860f180ccc613163eac))
* **user-actions:** add user actions to API ([#1384](https://github.com/grafana/faro-web-sdk/issues/1384)) ([9db1bb7](https://github.com/grafana/faro-web-sdk/commit/9db1bb77fea2d3158ee7fcf40d8b50688cb372b5))
* **web-sdk:** add `httpHost` to `faro.performance.resource` events ([#2014](https://github.com/grafana/faro-web-sdk/issues/2014)) ([517d26f](https://github.com/grafana/faro-web-sdk/commit/517d26f17f96d21990e52c5804a0b77676f685df))
* **web-sdk:** include active instrumentations in sdk meta payload ([#1972](https://github.com/grafana/faro-web-sdk/issues/1972)) ([8585a2f](https://github.com/grafana/faro-web-sdk/commit/8585a2f50d387d8dfb7b6af042bcf6ca253b6f2f))


### Bug Fixes

* **build:** deduplicate tsBuildInfoFile paths in tsconfig.bundle.json ([#1947](https://github.com/grafana/faro-web-sdk/issues/1947)) ([92fd42a](https://github.com/grafana/faro-web-sdk/commit/92fd42a735ec3f3cb6516fa5eaa95d563cfa1862))
* **ci:** consolidate release-please into single changelog and unblock release PR ([#2048](https://github.com/grafana/faro-web-sdk/issues/2048)) ([1454048](https://github.com/grafana/faro-web-sdk/commit/14540489ca20ff2e1797700f14e440a7ea637709))
* **ci:** correct jsonpath syntax in release-please extra-files ([#2049](https://github.com/grafana/faro-web-sdk/issues/2049)) ([0ca2dfe](https://github.com/grafana/faro-web-sdk/commit/0ca2dfe5d833c871ed115b9ed07854ea4e4fdbfb))
* **ci:** correct release-please changelog-path to unblock release flow ([#2045](https://github.com/grafana/faro-web-sdk/issues/2045)) ([1682dd9](https://github.com/grafana/faro-web-sdk/commit/1682dd9b959f7ac336d61fd65b91838e9166e87c))
* circular dependency between events and userActions APIs ([#1793](https://github.com/grafana/faro-web-sdk/issues/1793)) ([8838230](https://github.com/grafana/faro-web-sdk/commit/8838230ff4c462fb8951b9e474c1025e4d39bc31))
* **ci:** renovate bot config ([#1743](https://github.com/grafana/faro-web-sdk/issues/1743)) ([97a0073](https://github.com/grafana/faro-web-sdk/commit/97a0073dff35a5c9f4ea349a32844308ec090768))
* **ConsoleInstrumentation:** make console instrumentation work with multiple SDK instances ([#1825](https://github.com/grafana/faro-web-sdk/issues/1825)) ([61719d7](https://github.com/grafana/faro-web-sdk/commit/61719d7f8616def644fc77379036a9e84ed48f13))
* **core,web-sdk,react:** use monotonic clock for duration measurements ([#2016](https://github.com/grafana/faro-web-sdk/issues/2016)) ([c96c565](https://github.com/grafana/faro-web-sdk/commit/c96c565026503972eceae6c47d53fd81eaf9da75))
* **core:** provide no-op faro.api default before initializeFaro ([#2009](https://github.com/grafana/faro-web-sdk/issues/2009)) ([10c4783](https://github.com/grafana/faro-web-sdk/commit/10c478399ec9171e73c814d2f74557dc93e9287a))
* demo doesn't build correctly with docker ([#1692](https://github.com/grafana/faro-web-sdk/issues/1692)) ([dc5e522](https://github.com/grafana/faro-web-sdk/commit/dc5e52291322e4b6d3ab053fcd27bd825ae64c9b))
* **demo:** added instrumentation-replay package to demo docker environment ([#1942](https://github.com/grafana/faro-web-sdk/issues/1942)) ([eb91a69](https://github.com/grafana/faro-web-sdk/commit/eb91a6987e2f13b46ad0191a8f4f5738f166560c))
* **demo:** show correct session id & dep fix ([#1866](https://github.com/grafana/faro-web-sdk/issues/1866)) ([57326d6](https://github.com/grafana/faro-web-sdk/commit/57326d6e329ef455a284dbfdecf5e3ef201b04f1))
* **deps:** update dependency protobufjs to v8 ([#1840](https://github.com/grafana/faro-web-sdk/issues/1840)) ([fd33622](https://github.com/grafana/faro-web-sdk/commit/fd336225b5b2807fa2ddfb695b259dfa7cc3746a))
* **deps:** update npm-dependencies ([#1768](https://github.com/grafana/faro-web-sdk/issues/1768)) ([5821051](https://github.com/grafana/faro-web-sdk/commit/58210511f59d09c4e51e050b77d74ef0f8884751))
* **deps:** update npm-dependencies ([#1836](https://github.com/grafana/faro-web-sdk/issues/1836)) ([307802a](https://github.com/grafana/faro-web-sdk/commit/307802ac2a44389236b7affdcb63876b029d99e5))
* **deps:** update npm-dependencies ([#1856](https://github.com/grafana/faro-web-sdk/issues/1856)) ([bbf7c29](https://github.com/grafana/faro-web-sdk/commit/bbf7c29f40cf61198af16f67798a70f1e2cccd43))
* **deps:** update npm-dependencies ([#1900](https://github.com/grafana/faro-web-sdk/issues/1900)) ([1c7fbe0](https://github.com/grafana/faro-web-sdk/commit/1c7fbe0559a4497126140598090a4d4df20313e4))
* **deps:** update npm-dependencies ([#1912](https://github.com/grafana/faro-web-sdk/issues/1912)) ([f8310c1](https://github.com/grafana/faro-web-sdk/commit/f8310c15524610c1db8e6bda323773dc905629d4))
* **deps:** update npm-dependencies ([#1936](https://github.com/grafana/faro-web-sdk/issues/1936)) ([edeb578](https://github.com/grafana/faro-web-sdk/commit/edeb578a3903b9c9ca7c7aa240ab3ad38032d1f5))
* **deps:** update npm-dependencies ([#1965](https://github.com/grafana/faro-web-sdk/issues/1965)) ([25e3173](https://github.com/grafana/faro-web-sdk/commit/25e3173104f49db60d347b3a87f1bda2c43427b5))
* **deps:** update npm-dependencies ([#1994](https://github.com/grafana/faro-web-sdk/issues/1994)) ([868a5b7](https://github.com/grafana/faro-web-sdk/commit/868a5b7de1fa86b7d9e52507d4da5f95b2d10e1f))
* **deps:** update npm-dependencies ([#2019](https://github.com/grafana/faro-web-sdk/issues/2019)) ([445f385](https://github.com/grafana/faro-web-sdk/commit/445f3859b954ac2277aea361844ac5cb6615d9b0))
* don't assume a window when testing for k6 ([#1644](https://github.com/grafana/faro-web-sdk/issues/1644)) ([b638440](https://github.com/grafana/faro-web-sdk/commit/b6384405460bc9a9fa21029d62550f6450acb231))
* **errors:** preserve error type for Error subclasses in getErrorDetails ([#1971](https://github.com/grafana/faro-web-sdk/issues/1971)) ([4f898c1](https://github.com/grafana/faro-web-sdk/commit/4f898c1c01a93d1c539ceb7f11318d609c94931f))
* **fetch-transport:** fix flaky 429 backoff tests by initializing disabledUntil to epoch ([#1988](https://github.com/grafana/faro-web-sdk/issues/1988)) ([16ee6f6](https://github.com/grafana/faro-web-sdk/commit/16ee6f6a044d42e3fa876014a91cd3df1512d53f))
* linter issue ([#1510](https://github.com/grafana/faro-web-sdk/issues/1510)) ([ddd3bc2](https://github.com/grafana/faro-web-sdk/commit/ddd3bc2faf8af026d180002c34b92dc7617604d0))
* **metas:** incude sdk name in meta ([#1869](https://github.com/grafana/faro-web-sdk/issues/1869)) ([f3d64a0](https://github.com/grafana/faro-web-sdk/commit/f3d64a0f216d38460bb11065fbd3e408fa878006))
* prevent filename from being badly extracted when no function name is resolved ([#1475](https://github.com/grafana/faro-web-sdk/issues/1475)) ([8efdd77](https://github.com/grafana/faro-web-sdk/commit/8efdd7747180110708edcdc481955ba9f927e7a8))
* **release:** remove yarn build from pre-commit hook ([#2003](https://github.com/grafana/faro-web-sdk/issues/2003)) ([4ce931a](https://github.com/grafana/faro-web-sdk/commit/4ce931a032e182e7de326453f8473d5a869a4607))
* **session:** prevent infinite recursion in session meta sync ([#1956](https://github.com/grafana/faro-web-sdk/issues/1956)) ([ef966c2](https://github.com/grafana/faro-web-sdk/commit/ef966c21bb8db642e4ed820789d4f57047df229a))
* update husky pre-commit hook to v9 format ([#1984](https://github.com/grafana/faro-web-sdk/issues/1984)) ([799c237](https://github.com/grafana/faro-web-sdk/commit/799c237750761b96e5229897d3655107970958ab))
* **user actions:** buffered items were dropped on cancel ([#1861](https://github.com/grafana/faro-web-sdk/issues/1861)) ([bd14888](https://github.com/grafana/faro-web-sdk/commit/bd14888a4cbec565a219aa7f6dc1e427a8047e17))
* **user actions:** do not associate events with halted user action ([#1677](https://github.com/grafana/faro-web-sdk/issues/1677)) ([f2c56c5](https://github.com/grafana/faro-web-sdk/commit/f2c56c5b651f3648faa96961d8edaed46e2a50f9))
* **user-actions:** custom severity wasn't added to user action attributes ([#1551](https://github.com/grafana/faro-web-sdk/issues/1551)) ([bac611a](https://github.com/grafana/faro-web-sdk/commit/bac611ad8f759efddaa12c67570f71ca29bac145))
* **web-sdk:** capture all CSP violation event attributes ([#1819](https://github.com/grafana/faro-web-sdk/issues/1819)) ([2d83e27](https://github.com/grafana/faro-web-sdk/commit/2d83e272bdb13b3b48414d1f493ddf4181ee2579))
* **web-tracing:** decouple tracing events from global faro instance ([#1874](https://github.com/grafana/faro-web-sdk/issues/1874)) ([bea0277](https://github.com/grafana/faro-web-sdk/commit/bea0277a17892aeed4c77e799979da58e9610011))
* **web-tracing:** export FaroMetaAttributesSpanProcessor class ([#1577](https://github.com/grafana/faro-web-sdk/issues/1577)) ([6bb6529](https://github.com/grafana/faro-web-sdk/commit/6bb6529280bd7b7c6d1652c07e1f95fdb240af40))
* **web-tracing:** import faro from correct package ([#1500](https://github.com/grafana/faro-web-sdk/issues/1500)) ([a57548d](https://github.com/grafana/faro-web-sdk/commit/a57548d08b44ead7fffa47f07bf1cba3a41276b3))

## 2.5.0

- Fix (`@grafana/faro-web-sdk`): Use monotonic clock instead of wall clock for duration
  measurements (#2016).

- Fix (`@grafana/faro-core`): `faro.api` is now a no-op before `initializeFaro()` runs,
  preventing `TypeError: faro.api is undefined` when accessed pre-initialization or with
  duplicate singleton copies (#1889).

- Feature (`@grafana/faro-core`): Extend TS types for new Faro spec fields — `MetaOS`,
  `MetaDevice`, `meta.os`, `meta.device`, `meta.app.installationId`, and `fatal` on
  `ExceptionEventDefault`. `meta.device` and `meta.app.installationId` are not populated
  by the Web SDK. `fatal` can be set via `pushError(err, { fatal: true })` and participates
  in dedupe (#1997).

- Feature (`@grafana/faro-web-sdk`): New default `osMeta` provider populates `meta.os`
  (`name`, `version`) from the user agent. Registered automatically and re-exported for
  custom meta setups (#1997).

- Fix (`@grafana/faro-core`): Exception dedupe now considers the stacktrace. The dedupe
  key previously referenced a non-existent `stackTrace` field (camelCase typo), so errors
  with the same message/type but different stacks were deduped. Consumers relying on
  `config.dedupe` may see an increase in reported exceptions (#1997).

- Chore (`@grafana/faro-*`): Pinned `protobufjs` to `^8.0.1` to remediate CVE-2026-41242,
  and updated multiple other dependencies (#2008, #2010, #2011, #2012, #2017, #2019).

## 2.4.0

- Chore (`@grafana/faro-*`): Updated `protobufjs` to `^8.0.1` to remediate CVE-2026-41242.

- Feature (`@grafana/faro-transport-otlp-http`): Allow async dynamic header values for the OTLP
  HTTP transport. Each header value can be a function returning `Promise<string>`, resolved at
  request time (e.g. for token refresh). Sync dynamic headers (`() => string`) continue to work
  (#1490).

- Feature (`@grafana/faro-instrumentation-replay`): Emit a `faro.session_recording.started` Faro
  event when rrweb session recording successfully starts, so backends can identify which sessions
  have an associated recording (#1925).

- Fix (`@grafana/faro-web-sdk`): `getErrorDetails` now preserves the `type` field for `Error`
  subclasses (e.g. `TypeError`, `RangeError`, `SyntaxError`) when captured via `console.error`
  or the global error handler (#1971).

- Chore (`@grafana/faro-*`): Updated multiple dependencies to address security vulnerabilities
  (#1973, #1969, #1976, #1980, #1968, #1965).

## 2.3.1

- Fix (`@grafana/faro-web-sdk`): Prevent infinite recursion in session meta sync when session
  attributes contain values not surviving JSON serialization such as `undefined` (#1956).

- Chore (`@grafana/faro-*`): Updated multiple dependencies to address security vulnerabilities
  (#1948, #1941).

## 2.3.0

- Feature (`@grafana/faro-web-sdk`): Fetch transport now supports async dynamic header values.
  Each header value can be a function returning `Promise<string>`, resolved at request time
  (e.g. for token refresh). Sync dynamic headers (`() => string`) continue to work (#1490).

- Feature (`@grafana/faro-core`): Add optional `fingerprint` attribute to exception events for
  custom error grouping. The fingerprint can be passed via `pushError` options or set in the
  `beforeSend` hook.

- Feature (`@grafana/faro-instrumentation-replay`): Enable full input and text
  masking by default (`maskAllInputs: true`, `maskTextSelector: '*'`) (#1926).

- Feature (`@grafana/faro-instrumentation-replay`): Add `samplingRate` option to
  `ReplayInstrumentationOptions` to decouple replay coverage from global session sampling (#1919).

- Chore (`@grafana/faro-*`): Updated multiple dependencies to address security vulnerabilities
  (#1931, #1922, #1930).

## 2.2.4

- Feature (`@grafana/faro-instrumentation-replay` [experimental]): Add `recordAfter` option
  to configure replay recording start timing (`DOMContentLoaded` or `load`), with `load`
  as the default.

- Chore (`@grafana/faro-*`): Updated multiple dependencies including OpenTelemetry v0.212.0 and
  npm-run-all2 v7 (#1900, #1899, #1891, #1902).

- Chore (demo): Updated dependency react-router to v7.12.0 to address security vulnerability (#1834).

## 2.2.3

- Feature (`@grafana/faro-react`): Add `createReactRouterV7Options` and
  `createReactRouterV7DataOptions` helper functions for easier React Router v7
  configuration (#1879).

- Fix (`@grafana/faro-react`): Migrated from new JSX transform (`react-jsx`) to classic JSX transform
  (`react`) to prevent bundling `react/jsx-runtime` with the package. This fixes compatibility issues
  with React 19 and older React versions where bundled JSX runtime could cause breakage. React and
  react-dom are now properly treated as external peer dependencies in all bundle formats (#1878).

- Fix (`@grafana/faro-web-tracing`): Fixed a race condition where `faro.tracing.*` events were
  always sent via the global Faro instance instead of the SDK instance associated with the
  FaroTraceExporter. This caused events to be incorrectly attributed in multi-instance setups
  (#1874).

- Chore (`@grafana/faro-core`, `@grafana/faro-web-sdk`): SDK name
  (`meta.sdk.name`) is now included in payload metadata alongside
  version. The SDK name is set to `faro-web`
  in web-sdk configuration. If web sdk meta was included manually previously,
  it could potentially be breaking as instrumentation metas are removed
  and sdk name changed from `@grafana/faro-core`to`faro-web` (#1865).

## 2.2.2

- Chore (`@grafana/faro-web-sdk`): Pin ua-parser-js package version (#1867).

## 2.2.1

- Fix (`@grafana/faro-core`): Buffered items are now correctly sent when a user action is cancelled
  (#1861).

- Chore (`@grafana/faro-*`): Updated multiple dependencies to address security vulnerabilities
  (#1855).

- Chore (`@grafana/faro-*`): Updated multiple otel dependencies (#1856).

## 2.2.0

- Feature (`@grafana/faro-web-sdk`): Fetch transport now supports dynamic header values.
  Each header can be a static string or a function returning a string, resolved at request
  time (#1490).

- Feature (`@grafana/faro-transport-otlp-http [experimental]`): OLTP HTTP transport now supports
  dynamic header values. Each header can be a static string or a function returning a string,
  resolved at request time (#1490).

- Fix (`@grafana/faro-web-sdk`): Console instrumentation now correctly handles multiple SDK
  instances (#1825).

- Chore (`@grafana/faro-*`): Updated multiple dependencies to address security vulnerabilities.

## 2.1.0

- Feature (`@grafana/faro-react`): support for React 19 and React Router 7

- Fix (`@grafana/faro-web-sdk`): CSP violation events now correctly capture all SecurityPolicyViolationEvent
  attributes. Previously, properties like `blockedURI`, `documentURI`, and others were missing because
  native browser event properties are getters on the prototype chain, not own enumerable properties (#1491)

- Fix (`@grafana/faro-web-sdk`): circular dependency between events and userActions APIs (#1793)

## 2.0.2

- Breaking (`@grafana/faro-web-sdk`): User action events now have a standardized event name
  (`faro.user.action`), with the specific user action name moved to a parameter for improved
  consistency and filtering capabilities.
  **Migration note:** If you previously filtered user action events by event name, update your
  queries to use the new event name (`faro.user.action`) and filter by the `userActionName`
  attribute for the specific action.

- Breaking (`@grafana/faro-web-sdk`): Web vitals now always tracks attribution data. The
  `trackWebVitalsAttribution` and `webVitalsInstrumentation.trackAttribution` configuration flags have
  been removed. Attribution data is now collected by default and cannot be disabled.
  **Migration note:** If you were using `trackWebVitalsAttribution: false` or
  `webVitalsInstrumentation: { trackAttribution: false }` to disable attribution, remove these options
  from your configuration. Attribution data will now always be included in web vitals measurements.

- Breaking (`@grafana/faro-web-sdk`): Removed the `trackUserActionsPreview` option from Faro
  configuration. User actions instrumentation is now always enabled by default (#1772).
  **Migration note:** If you previously used `trackUserActionsPreview: true` or left it unset,
  simply remove this option - no further action is required. If you had set
  `trackUserActionsPreview: false` to disable user actions tracking, you now need to exclude the
  `UserActionInstrumentation` from your instrumentations array manually.

- Feature (`@grafana/faro-web-sdk`) [experimental]: Added navigation instrumentation to track soft
  navigations (same-document navigations). The instrumentation monitors URL changes, DOM mutations,
  HTTP requests, and user interactions to automatically detect and report navigation events with
  details including fromUrl, toUrl, and duration. Enable by setting `experimental.trackNavigation: true`
  in the configuration.

- Fix (`@grafana/faro-web-sdk`): Fixed an issue where custom severity and custom trigger properties
  were not being included in user action attributes (#1551)
- Fix (`@grafana/faro-web-sdk`): Fixed an error when `initializeFaro` is called without any window
  object present (#1643)

## 2.0.0.beta-2

- Fix (`@grafana/faro-web-tracing`): fixed error with the web-tracing CDN bundle related to
  incorrect dependency import of the getActiveUserAction API (#1500)

## 2.0.0.beta

- Feature (`@grafana/faro-web-sdk`): Updated the web-vitals library to v5 (#1386)
- Feature (`@grafana/faro-web-sdk`): Added user actions to the API (#1384)
- Feature (`@grafana/faro-web-sdk`): Added user actions severity (#1418)

- Chore (`@grafana/faro-*`): set default node version to lts/jod
- Fix (`@grafana/faro-web-sdk`): Update `webkitLineRegex` to prevent the
  function name capture group from matching URLs

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
