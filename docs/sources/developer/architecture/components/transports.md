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
responses. Defaults are three total attempts, a ten-second send deadline, and exponential
backoff starting at one second and capped at thirty seconds. Each batch retains its body and
`Idempotency-Key` across attempts. Collector CORS policies must allow `Idempotency-Key` before
this SDK version is deployed. The header alone does not guarantee server-side deduplication.
Retries have at-least-once semantics: a lost acknowledgement can cause already accepted data to
be sent again. Bounded retries can also exhaust and drop a batch, so delivery is not guaranteed.

`requestTimeoutMs` is one budget starting when `send()` accepts a batch. It includes custom
promise-buffer scheduling, header resolution, compression, delivery queue waits, network
requests, keepalive fallback, retries, and backoff. For example, eight seconds of preparation
leave two seconds of a ten-second budget. Earlier SDK batching is outside that budget. Values
at or below zero disable the SDK timer; `requestOptions.signal` still cancels the whole send.

Cancellation or expiry releases admission and delivery capacity even when an abandoned callback
or fetch ignores its abort signal. Late work cannot resume preparation, send again, or process
session-invalid responses. The SDK checks the budget after synchronous application callbacks,
which cannot be preempted. An exception from `onSessionChange` after an accepted response is
logged without retrying that batch.

`Idempotency-Key` and `X-Faro-Session-Id` are managed headers. Custom header names are compared
case-insensitively and cannot override them. Response-driven renewal checks the expected session
inside the updater and again before mutation after application callbacks. Persistent-session
storage remains best-effort across tabs; this check is not a cross-tab atomic transaction.

Package-root `FetchTransport` imports and constructor options remain supported. Advanced callers can
set `retry` and `requestTimeoutMs` when constructing a transport. The deprecated
`defaultRateLimitBackoffMs` option aliases `retry.initialBackoffMs`; an explicit
`retry.initialBackoffMs` takes precedence. It now controls retry backoff rather than a global
cooldown that drops intervening events.

Remove `experimental.fetchTransportV2` from configuration: reliable Fetch is now unconditional.
The former `fetch-v2` module paths have been removed. Import `FetchTransport` and its public option
types from `@grafana/faro-web-sdk` instead. This is a breaking change for callers using the flag or
removed deep imports; there is no legacy transport fallback.

The default `promiseBuffer.add()` shares admission and concurrency with delivery. Tasks submitted
directly through that API run once; transport requests use the retry policy. Custom buffer replacements
and decorators retain their own outer scheduling so waiting for delivery cannot deadlock their worker.
Repeated invocation of a scheduler's producer shares one preparation and delivery lifetime.

Transports can implement optional synchronous `initialize()` and `destroy()` hooks. Core installs
configuration and metadata before initialization, rolls back failed registration, and revokes a
registration before calling its disposer. A replacement registered during cleanup remains owned
by its own registration. Fetch also initializes its browser listeners for standalone constructor
use. Removal detaches its pagehide/pageshow listeners; re-adding it restores them. Previously
accepted sends retain their own deadline and may finish after removal.

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
