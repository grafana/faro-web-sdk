# Changelog

## Next

## 1.2.0 – 1.2.1

### FetchInstrumentation

- Change: fetch instrumentation log attribute "statusText" is now "status_text"

### XHRInstrumentation

- Added support for `XMLHttpRequest` instrumentation.

## 1.1.4

### FaroOtlpHttpTransport

- Fix: The outer shape of the payload was not correct which lead to 400 response status codes ([#252](https://github.com/grafana/faro-web-sdk/issues/252)).

## 1.1.3

### FetchInstrumentation

- [❗️Breaking❗️]: Events are now namespaced and have been renamed to prevent collisions with user
  defined events. Event names changed from:

  - `Resolved fetch` to `faro.fetch.resolved`
  - `Rejected fetch` to `faro.fetch.rejected`

  See [Fetch Instrumentation README](https://github.com/grafana/faro-web-sdk/blob/e998555bd7177b7edbebf98f804372b04b6c30e6/experimental/instrumentation-fetch/README.md#L8)
  for more information.

### PerformanceTimelineInstrumentation

- [❗️Breaking❗️]: The performance entry event is now namespaced and has been renamed to prevent
  collisions with user defined events. Event name changed from `performanceEntry` to
  `faro.performanceEntry`.
  See [Performance-Timeline-Instrumentation README](https://github.com/grafana/faro-web-sdk/blob/8928dc3d4835373cb3566520cd783dce1ef3b7cf/experimental/instrumentation-performance-timeline/README.md#L32-L33)
  for more information.

## 1.1.0

- Add: Experimental package for Fetch instrumentation.

### FetchInstrumentation

### PerformanceTimelineInstrumentation

- Add: beforeEmit hook to make it possible to mutate performance entries.
- Add: only observe entry types which are supported by the visitors browser.
- [❗️Breaking❗️] Remove: `skipEntries` entries are no removed in favor of the `beforeEmit` hook. You can find an
  [example how to skip entries in the README.](https://github.com/grafana/faro-web-sdk/blob/a83d2e56b7289ea81a1d0f87c03f73d04bd44e38/experimental/instrumentation-performance-timeline/README.md#example-skip-backforward-navigation-and-page-reloads-to-remove-non-human-visible-navigation)

### OtlpHttpTransport

- Fix: add correct span_id when transforming Faro to Otlp model.
- Fix: add additional log context to logs.

## 1.0.5

- Change: Align versioning scheme to have the same version for all Faro Web-SDK packages.

## 1.0.0.beta.0 - 1.0.0.beta.1

- Add: Experimental package for Open Telemetry compliant HTTP transport.
- Add: Experimental package for Batch transport.
- Add: Experimental package browser Performance Timeline instrumentation.
