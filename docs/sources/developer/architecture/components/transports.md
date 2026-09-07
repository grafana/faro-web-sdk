# Transports

Transports are the final data processors in the Faro architecture. They are responsible for doing something with the
data once it has been collected by the instrumentations and processed by the internal API.

The core library does not provide any transports out of the box. They are either provided by wrapper packages like
`web-sdk` or by the user.

## Fetch-v2 session identity

With `experimental.fetchTransportV2: true`, each request's `X-Faro-Session-Id` header identifies
the session in its payload. Async header resolution, compression, queueing, and retries do not
replace that identity with the current session.

A collector `202` response with `X-Faro-Session-Status: invalid` renews the session only if the
request's session is still current in memory and storage. Delayed responses cannot renew a newer
session, including one another tab has established. This guarantee does not apply to legacy `fetch`.

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
