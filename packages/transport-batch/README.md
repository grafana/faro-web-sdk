# @grafana/transport-batch

Faro transport to batch and transfer signals to a selected transport for sending.

❗️ _Warning_: this package is experimental and may be subject to frequent and breaking changes. Use at your own risk. ❗️

The Faro Batch Transport batches the signals it receives and transfers them to configured Transport.
Batching signals is either done by (signal) count or by a specific time window.

The count as well as the time window can be adjusted to your needs.

If a user navigates to another page, switches or closes the tab, minimizes or closes the browser,
the batch buffer will be flushed and it's items will be sent so no data is lost.

If on mobile, it also sends data if user switches from the browser to a different app.

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
    new BatchTransport(
      new OtlpHttpTransport({
        apiKey: env.faro.apiKey,
        logsURL: 'https://example.com/v1/logs',
        tracesURL: 'https://example.com/v1/traces',
      }),
      {
        // This config object is optional and only needed if you want to change the defaults.
        batchSendCount: 80, // default is 50 signals.
        batchSendTimeout: 500, // default is 250ms
      }
    ),
  ],
});
```

## Usage

The Batch Transports is only responsible to do the batching logic.
To send the batch of signals you need to add a transport which supports to send a list of signals!

Note:<br />
Currently the only Transport which supports batching is the `OtlpHttpTransport`.
Others will follow soon.

With the second parameter you can customize:

- The number of signals which should be included in a batch. Default is 50 signals.
- The time window after which the batch should be send. If set to 0, this functionality is turned of. Not that the timer will win over the count! Means items will forcefully send after `batchSendTimeout` independent from the signal count.
