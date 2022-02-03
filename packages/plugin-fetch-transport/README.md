# @grafana/javascript-agent-plugin-fetch-transport

Grafana JavaScript Agent plugin for sending the data to a specific URL.

---

## Installation

```ts
import { initializeAgent, LogLevel } from '@grafana/javascript-agent-core';
import getFetchTransportPlugin from '@grafana/javascript-agent-plugin-fetch-transport';

const agent = initializeAgent({
  plugins: [
    // Add the plugin to the plugins list while initializing the agent
    getFetchTransportPlugin({
      // Pass the URL to the backend service that will receive the data
      url: 'https://localhost:8080/collect',
    }),
  ],
});
```

---

## Options

The plugin needs a configuration object in order to pass the `url` but the rest of the options are optional:

| Property         | Description                                                        | Type                                 | Default Value |
| ---------------- | ------------------------------------------------------------------ | ------------------------------------ | ------------- |
| `url`            | The URL to the backend service                                     | `string`                             | `undefined`   |
| `debug`          | Flag to enable or disable the debug mode for the current transport | `boolean`                            | `false`       |
| `requestOptions` | An object to pass to the request (i.e. headers, method etc.)       | `FetchTransportPluginRequestOptions` | `undefined`   |
