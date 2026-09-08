# Transports

Transports are the final data processors in the Faro architecture. They are responsible for doing something with the
data once it has been collected by the instrumentations and processed by the internal API.

The core library does not provide any transports out of the box. They are either provided by wrapper packages like
`web-sdk` or by the user.

## Fetch delivery and session identity

The default Fetch transport sends each request with an `X-Faro-Session-Id` header identifying
the session in its payload. Async header resolution, compression, queueing, and retries do not
replace that identity with the current session.

A collector `202` response with `X-Faro-Session-Status: invalid` renews the session only if the
request's session is still current in memory and storage. Delayed responses cannot renew a newer
session, including one another tab has established.

The transport retries transient network failures and HTTP 408, 425, 429, 500, 502, 503, and 504
responses. Defaults are three total attempts, a ten-second request timeout, and exponential
backoff starting at one second and capped at thirty seconds. Each batch retains its body and
`Idempotency-Key` across attempts. Collector CORS policies must allow `Idempotency-Key` before
this SDK version is deployed. The header alone does not guarantee server-side deduplication.

Existing `FetchTransport` imports and constructor options remain supported. Advanced callers can
set `retry` and `requestTimeoutMs` when constructing a transport. The deprecated
`defaultRateLimitBackoffMs` option aliases `retry.initialBackoffMs`; an explicit
`retry.initialBackoffMs` takes precedence. It now controls retry backoff rather than a global
cooldown that drops intervening events.

`experimental.fetchTransportV2` is retained as a deprecated no-op, including when set to `false`.
There is one Fetch implementation. Existing `fetch-v2` module paths forward to it for compatibility.
The default `promiseBuffer.add()` shares admission and concurrency with delivery. Tasks submitted
directly through that API run once; transport requests use the retry policy. Custom buffer replacements
and decorators retain their own outer scheduling so waiting for delivery cannot deadlock their worker.

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
