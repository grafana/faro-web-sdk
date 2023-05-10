# Changelog

## Next

### PerformanceTimelineInstrumentation

- Add: beforeEmit hook to make it possible to mutate performance entries.

#### Breaking Changes

- Remove: `skipEntries` entries are no removed in favor of the `beforeEmit` hook. You can find an
  [example how to skip entries in the README.](https://github.com/grafana/faro-web-sdk/blob/a83d2e56b7289ea81a1d0f87c03f73d04bd44e38/experimental/instrumentation-performance-timeline/README.md#example-skip-backforward-navigation-and-page-reloads-to-remove-non-human-visible-navigation)

## 1.0.5

- Change: Align versioning scheme to have the same version for all Faro Web-SDK packages.

## 1.0.0.beta.0 - 1.0.0.beta.1

- Add: Experimental package for Open Telemetry compliant HTTP transport.
- Add: Experimental package for Batch transport.
- Add: Experimental package browser Performance Timeline instrumentation.
