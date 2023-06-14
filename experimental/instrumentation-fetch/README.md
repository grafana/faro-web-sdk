# @grafana/instrumentation-fetch

Faro instrumentation of the JavaScript [Fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) API

❗️*Warning*: this package is experimental and may be subject to frequent and breaking changes.
Use at your own risk.❗️

## Installation and Usage

```ts
// index.ts
import { FetchInstrumentation } from '@grafana/faro-instrumentation-fetch';
import { getWebInstrumentations, initializeFaro } from '@grafana/faro-react';

initializeFaro({
  // ...
  instrumentations: [
    // Load the default Web instrumentations
    ...getWebInstrumentations(),
    // Add fetch instrumentation
    new FetchInstrumentation(),
  ],
});


// myApi.ts
fetch(...) // Use fetch as normal - telemetry data is sent to your Faro endpoint
```

## Planned Development
- Additional functionality to correlate frontend requests with backend actions
- Event attributes with end-to-end timing details