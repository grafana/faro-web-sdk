# Changelog

## Next

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
