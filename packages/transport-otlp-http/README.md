# @grafana/transport-otlp-http

Faro transport which converts the Faro model to the Open Telemetry model.

❗️*Warning*: this package is experimental and may be subject to frequent and breaking changes. Use at your own risk.❗️

❗️*Warning*: The Grafana Receiver does not support this format yet.❗️

## Installation

```ts
import { getWebInstrumentations, initializeFaro } from '@grafana/faro-react';
import { BatchTransport } from '@grafana/faro-transport-batch';
import { OtlpHttpTransport } from '@grafana/faro-transport-otlp-http';

initializeFaro({
  // ...
  instrumentations: [
    // Load the default Web instrumentations
    ...getWebInstrumentations(),
  ],
  transports: [
    new OtlpHttpTransport({
      apiKey: env.faro.apiKey,
      logsURL: 'https://example.com/v1/logs',
      tracesURL: 'https://example.com/v1/traces',
    }),
  ],
});
```

## Usage

The Faro OtlpHttpTransport converts the Faro model to the Otlp schema, so you can send Faro data to
compatible Otel Receivers.

### Config Options

- `apiKey?: string`: Will be added as `x-api-key` header.
- `bufferSize?: number`: How many requests to buffer in total.
- `concurrency?: number`: How many requests to execute concurrently.
- `defaultRateLimitBackoffMs?: number` How many milliseconds to back off before attempting a request
  if rate limit response does not include a Retry-After header. ❗️Intermediate events will be dropped, not buffered❗️
- `requestOptions?: OtlpTransportRequestOptions`: Additional options to add to requests when sending the data.
- `tracesURL?: string`: Endpoint to send Traces to.
- `logsURL?: string`: Endpoint to send Logs to.

Note: Why is there no Metrics endpoint? <br />
Faro does not collect Metrics as defined by the Open Telemetry specification.
For example Faro does not have metric types, such as Gauge or Sum or Histogram and so on, as Open Telemetry does.
Faro stores Metric values as log lines called `Measurements`.
It is not feasible to translate Measurements to Metrics while staying compliant with the Open Telemetry spec.
So we do not convert them and they are still be sent as a log type.
