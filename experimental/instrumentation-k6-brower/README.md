# @grafana/instrumentation-k6-browser

Faro instrumentation ... TODO

❗️*Warning*: this package is experimental and may be subject to frequent and breaking changes.
Use at your own risk.❗️

## Installation

```ts
import { PerformanceTimelineInstrumentation } from '@grafana/faro-instrumentation-performance-timeline';
import { getWebInstrumentations, initializeFaro } from '@grafana/faro-react';

initializeFaro({
  // ...
  instrumentations: [
    // Load the default Web instrumentations
    ...getWebInstrumentations(),
    new K6BrowserInstrumentation(),
  ],
});
```

## Usage

TODO

### Config Options

TODO
