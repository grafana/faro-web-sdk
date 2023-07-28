# @grafana/instrumentation-fetch

Faro instrumentation of the JavaScript [Fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) API.

❗️*Warning*: this package is experimental and may be subject to frequent and breaking changes.
Use at your own risk.❗️

## Installation and Usage

Add the instrumentation as outlined below.
The instrumentation send the following events alongside respective request/response data like HTTP
headers and other response properties like status codes the requests url and more.

Event names are:

- `faro.fetch.resolved` for resolved requests.
- `faro.fetch.rejected` for rejected requests.

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
