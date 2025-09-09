# @grafana/faro-transport-otlp-http

Faro transport which converts the Faro model to the Open Telemetry model.

❗️*Warning*: this package is experimental and may be subject to frequent and breaking changes.
Use at your own risk.❗️

❗️*Warning*: The Grafana Receiver does not support this format yet.❗️

❗️*Warning*: Faro does not support a separate metrics format as Open Telemetry does.
This means Faro does not collect Metrics as defined by the Open Telemetry specification.
For example Faro does not have metric types, such as Gauge or Sum or Histogram and so on
as Open Telemetry does. Faro stores Metric values as log lines called `Measurements`.
It is not feasible to translate Measurements to Metrics while staying compliant with the
Open Telemetry spec. So we do not convert them and they are still be sent as a log type.❗️

## Installation

```ts
import { getWebInstrumentations, initializeFaro } from '@grafana/faro-react';
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

### Optional `body` property in Logs of type `Measurement` and `Exception`

The `body` field is optional as defined by the Otel Log spec.
Because of this we only add the body property only to signals which have a body value.
This is all signals besides of `Measurement` and `Exception`

This can cause issues with some Otel Collector components.

Faro provides the `createErrorLogBody` and `createMeasurementLogBody` functions which you can use
to create a body string for these logs.
Both properties are part of the `otlpTransform` object in `OtlpHttpTransportOptions`.

As a parameter each function gets the transport item of the log which is currently in transformation.
You can use values from this object to built a custom string.

#### Example

```ts
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

      // customize logs transformation
      otlpTransform: {
        // create custom body string for measurement logs
        createMeasurementLogBody(item) {
          // Note: It's not advisable to built big strings which contain redundant data because
          // it ads unnecessary bytes to the requests and your storage solution
          // This example is to show how we can use the transport-item to built a custom string
          const { payload } = item;
          const [measurementName, measurementValue] = Object.entries(payload.values).flat();
          const body = `faro.signal.measurement: type=${payload.type} name=${measurementName} value=${measurementValue}`;
          return body;
        },
        // create custom body string for error logs
        createErrorLogBody(item) {
          // Note: It's not advisable to built big strings which contain redundant data because
          // it ads unnecessary bytes to the requests and your storage solution
          // This example is to show how we can use the transport-item to built a custom string
          const { payload } = item;
          const body = `faro.signal.error: type=${payload.type} message=${payload.value}`;
          return body;
        },
      },
    }),
  ],
});
```

### Config Options

- `apiKey?: string`: Will be added as `x-api-key` header.
- `bufferSize?: number`: How many requests to buffer in total.
- `concurrency?: number`: How many requests to execute concurrently.
- `defaultRateLimitBackoffMs?: number` How many milliseconds to back off before attempting a request
  if rate limit response does not include a Retry-After header. ❗️Intermediate events will be dropped,
  not buffered❗️
- `requestOptions?: OtlpTransportRequestOptions`: Additional options to add to requests when
  sending the data.
- `tracesURL?: string`: Endpoint to send Traces to.
- `logsURL?: string`: Endpoint to send Logs to.
- `otlpTransform?:`: Customize parts of logs transformation.
- `otlpTransform.createErrorLogBody?: (item: TransportItem<ExceptionEvent>) => string`:
  create custom body for error logs.
  `otlpTransform.createMeasurementLogBody?: (item: TransportItem<MeasurementEvent>) => string;`:
  create custom body for measurement logs.
