# @grafana/instrumentation-xhr

Faro instrumentation of the JavaScript [XMLHttpRequest (XHR)](https://developer.mozilla.org/en-US/docs/Glossary/XMLHttpRequest) API

❗️*Warning*: this package is experimental and may be subject to frequent and breaking changes.
Use at your own risk.❗️

## Installation and Usage

```ts
// index.ts
import { XHRInstrumentation } from '@grafana/faro-instrumentation-xhr';
import { getWebInstrumentations, initializeFaro } from '@grafana/faro-react';

initializeFaro({
  // ...
  instrumentations: [
    // Load the default Web instrumentations
    ...getWebInstrumentations(),
    // Add XHR instrumentation
    new XHRInstrumentation(),
  ],
});

// myApi.ts
const req = new XMLHttpRequest();
req.open("GET", "...");
req.send(); // use XHR as normal - telemetry data is sent to your Faro endpoint
```
