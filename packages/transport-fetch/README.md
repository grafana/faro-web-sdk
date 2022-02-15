# @grafana/javascript-agent-transport-fetch

Grafana JavaScript Agent browser package for sending the collected data to a specified URL using `fetch`.

## Installation

```ts
import { initializeAgent, LogLevel } from '@grafana/javascript-agent-core';
import getFetchTransport from '@grafana/javascript-agent-transport-fetch';

const agent = initializeAgent({
  transports: [
    // Add the package to the transports list when initializing the agent
    getFetchTransport({
      // Pass the URL to the backend service that will receive the data
      url: 'https://localhost:8080/collect',
    }),
  ],
});
```

## Options

The package needs a configuration object in order to pass the `url` but the rest of the options are optional:

| Property         | Description                                                        | Type                           | Optional | Default Value |
| ---------------- | ------------------------------------------------------------------ | ------------------------------ | -------- | ------------- |
| `url`            | The URL to the backend service                                     | `string`                       | N        | `undefined`   |
| `debug`          | Flag to enable or disable the debug mode for the current transport | `boolean`                      | Y        | `false`       |
| `requestOptions` | An object to pass to the request (i.e. headers, method etc.)       | `FetchTransportRequestOptions` | Y        | `undefined`   |
