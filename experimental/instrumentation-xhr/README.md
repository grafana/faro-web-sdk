# @grafana/instrumentation-xhr

Faro instrumentation of the JavaScript
[XMLHttpRequest (XHR)](https://developer.mozilla.org/en-US/docs/Glossary/XMLHttpRequest) API

❗️*Warning*: this package is experimental and may be subject to frequent and breaking changes.
Use at your own risk.❗️

## Installation and Usage

❗️*Warning*: This package is not interoperable with `@opentelemetry/instrumentation-xml-http-request`.
Use one or the other❗️

```ts
// index.ts
import { XHRInstrumentation } from '@grafana/faro-instrumentation-xhr';
import { getWebInstrumentations, initializeFaro } from '@grafana/faro-react';

initializeFaro({
  // see the full set of options in the @grafana/faro-core README.md
  instrumentations: [
    // Load the default Web instrumentations
    ...getWebInstrumentations(),
    // Add XHR instrumentation
    new XHRInstrumentation({
      // specify ignoredUrls to prevent telemetry data from being sent to Faro when making requests to those URLs
      ignoredUrls: [/^https:\/\/www\.google-analytics\.com\/collect/],
    }),
  ],
});

// myApi.ts
const req = new XMLHttpRequest();
req.open('GET', '...');
req.send(); // use XHR as normal - telemetry data is sent to your Faro endpoint
```

## Backend correlation

In order to prepare backend correlation, this instrumentation adds the following headers to each
request that server-side instrumentation can use as context:

- `x-faro-session` - the client-side session id
