# Transports

Transports are the final data processors in the Faro architecture. They are responsible for doing something with the
data once it has been collected by the instrumentations and processed by the internal API.

The core library does not provide any transports out of the box. They are either provided by wrapper packages like
`web-sdk` or by the user.

## Transports SDK

The transports SDK is the internal handler for the transports component. It is responsible for keeping track of the
initialized transports as well as adding others, removing existing ones, pausing them etc.

Methods and properties:

- `add()` - adds a new transport
- `addBeforeSendHook()` - adds a hook that is called before a signal is sent to each transport
- `getBeforeSendHooks()` - returns the list of hooks that are called before a signal is sent to each transport
- `execute()` - sends a signal to each registered transport
- `isPaused()` - returns whether the transports are paused or not
- `pause()` - pauses the transports
- `remove()` - removes a specific transport
- `removeBeforeSendHooks()` - removes a specific hook
- `transports` - accesses the current list of registered transports
- `unpause()` - unpauses the transports

## Customizing the fetch transport

The `web-sdk` package provides `FetchTransport`, which sends collected data to a collector endpoint. You can replace the default transport when you need finer control over the request, such as adding custom headers, changing buffering, or enabling request compression.

When you provide a custom fetch transport, define the collector URL on the transport itself and omit the top-level `url` option from `initializeFaro`.

```ts
import { initializeFaro, FetchTransport } from '@grafana/faro-web-sdk';

initializeFaro({
  app: {
    name: 'my-app',
    version: '1.0.0',
  },
  transports: [
    new FetchTransport({
      url: myCollectorUrl,
      requestOptions: {
        headers: {
          'X-Scope-OrgID': myOrgId,
        },
      },
    }),
  ],
});
```

`requestOptions.headers` also accepts functions, including async functions, when a header value needs to be resolved for each request.
