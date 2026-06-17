---
title: "Web Worker Transport for Faro Web SDK"
authors: Dougal Matthews
created: 2026-05-13
status: Draft
reviewers: TBD
informed: Faro Web SDK team
---

# Web Worker Transport for Faro Web SDK

## Background

Faro's `FetchTransport` does `JSON.stringify()` + `fetch()` on the main thread. For typical
log/event/measurement payloads this is fine: serialization takes <1ms even on slow devices.

Session replay changes the equation. rrweb snapshots are large (10-100KB+ per batch), contain
deeply nested DOM trees, and arrive at high frequency (up to every animation frame during active
mutation). The transport batches these, but the batch flush still does `getTransportBody()` +
`JSON.stringify()` synchronously on the main thread. On throttled/mobile devices this blocks the
event loop for 5-50ms per flush, competing with the app's own rendering and network calls.

The recently shipped gzip compression feature (`requestCompression`) adds to this. While
`CompressionStream` is an async streaming API (not a single synchronous block like stringify),
the stream plumbing, chunk reading, and Blob construction still consume main-thread event loop
time on top of serialization.

## Problem

On slower devices with session replay enabled, Faro's transport flush creates long tasks that
degrade app responsiveness. Preliminary benchmarks show 18-35% higher app API tail latency
when comparing direct vs worker transport under 20x CPU throttle (see "Benchmark Caveats" for
methodology limitations; a "Faro disabled" baseline has not yet been measured). Users have
reported
jank during heavy DOM mutation periods. The transport is an observability tool; it should not
measurably degrade the thing it observes.

On fast hardware (modern desktop, M-series Mac) there is no measurable impact. This is
specifically a problem for:
- Mobile devices (especially mid/low-tier Android)
- CPU-constrained environments (heavy tab, background throttling)
- Session replay with high-frequency DOM mutations

## Goals

1. Reduce main-thread blocking from transport serialization for large payloads
2. Zero behavioral change for users who don't opt in
3. Graceful degradation: if the optimization can't run, fall back silently to current behavior
4. No new external dependencies or CDN assets for SDK consumers

### Non-Goals

- Changing the transport protocol or collector API
- Making this the default transport path (too many CSP/compatibility unknowns)

### Adjacent but Out of Scope

- **Reducing payload size at capture time.** Approaches like rrweb delta encoding, mutation
  coalescing, DOM pruning, structural sharing, or adaptive replay quality would reduce the root
  cause (large payloads) and are worth pursuing independently. They're complementary to transport
  optimization, not alternatives. This doc focuses on what the transport layer can do regardless
  of payload size. See "Rejected Alternatives" for more detail.

## Proposals

### Proposal 0: Do Nothing

Keep `JSON.stringify()` + `fetch()` on the main thread.

**Consequences:**
- Session replay users on slower devices continue to experience 18-35% increased tail latency
- Adding more instrumentation features (e.g. network body capture, interaction tracing) will
  make this worse over time as payload sizes grow
- The gzip compression feature compounds the problem
- Users who care about performance may avoid enabling session replay, reducing observability
  coverage

**Pros:**
- Zero code complexity added
- No CSP considerations
- No build pipeline changes
- No code duplication risk

**Cons:**
- Known, measured performance problem persists
- Gets worse as payloads grow
- Faro becomes a contributor to the performance problems it's meant to detect

### Proposal 1: Dedicated Web Worker with Flush-Time Clone (Recommended)

Move `getTransportBody()`, `JSON.stringify()`, optional gzip compression, and `fetch()` to an
opt-in dedicated Web Worker. The worker script is compiled at build time and inlined as a blob
URL, so there's no separate file for consumers to host.

```
Main thread                                Worker thread
--------------------------------------------  -------------------------
BatchExecutor flush
  -> resolve async headers (stays on main)
  -> postMessage({items, url, headers})   ->  getTransportBody(items)
     [structured clone of items]              JSON.stringify(body)
                                              compress(body)  // if enabled
                                              fetch(url, {body, headers})
                                              handle 429 / rate limiting
  <- postMessage({type, status})          <-
```

**Critical caveat: structured clone cost.** `postMessage` performs a structured clone of the
items array on the main thread before transferring to the worker. For deeply nested rrweb
snapshot objects, this clone may itself be a significant main-thread cost (potentially 5-30ms
for large batches on slow devices). This means the worker doesn't completely eliminate
main-thread blocking; it trades `JSON.stringify` blocking for structured clone blocking. The
net benefit depends on clone being faster than stringify, which is likely for typical payloads
but MUST be benchmarked before shipping. If clone cost is comparable to stringify, consider
Proposal 1b (worker-owned queue) or Proposal 6 (lazy serialization) instead.

**Structured clone semantic differences.** Structured clone is not semantically identical to
`JSON.stringify` for all JS values. Functions are not cloneable (throws `DataCloneError`, caught
by fallback), but subtler differences exist: `toJSON()` methods, class prototypes, property
accessors, and getters are not preserved by structured clone but are invoked by `JSON.stringify`.
For standard Faro payloads (plain objects, strings, numbers) this doesn't matter. But
`beforeSend` transforms or custom instrumentations could produce non-plain values that clone
successfully but stringify differently in the worker vs direct path. Ship gate: parity tests
must cover these edge cases, or the worker path must explicitly document that it only supports
structured-clone-safe/JSON-compatible transport items.

**API surface:**

```typescript
new FetchTransport({
  url: 'https://collector.example.com/collect',
  enableWorker: true,         // opt-in, default false
  requestCompression: true,   // works in both paths
  workerUrl: '/faro-worker.js',  // optional: use static file instead of blob URL
});
```

**Fallback triggers (all route to existing main-thread path):**
- `Worker` constructor unavailable (SSR, old browsers)
- CSP blocks `blob:` workers (logged at warn level with CSP guidance)
- Worker crashes at runtime (`onerror`)
- Page is hidden (`visibilitychange` flush, needs `keepalive`)
- `AbortSignal` present in `requestOptions` (not structured-cloneable)
- `postMessage` throws `DataCloneError`

Note: "silent fallback" means the SDK continues working, not that it's invisible. Worker
creation failure logs a warning with CSP guidance. Runtime fallbacks during normal operation
(hidden page, abort signal) are debug-level. This matches the SDK's existing logging philosophy.

**Build approach:**
- `transportWorker.ts` is a self-contained TypeScript file with no imports
- `scripts/build-worker.mjs` compiles it via Rollup + Terser to a minified IIFE string
- The string is written to `workerScript.generated.ts` (gitignored) and re-exported
- At runtime: `new Blob([script])` -> `URL.createObjectURL()` -> `new Worker(blobUrl)`
- Blob URL is revoked immediately after construction (Worker holds internal reference per spec)
- Alternative: if `workerUrl` is provided, `new Worker(workerUrl)` is used instead (no blob)

**Code duplication:**
The worker must be self-contained (no imports from the module graph). This means
`getTransportBody()` and `mergeResourceSpans()` (~50 lines) are duplicated from
`@grafana/faro-core`. The worker version already has minor differences (`?? []` vs `|| []`,
`for...of` vs `forEach`, direct mutation vs spread). Mitigation options:
1. Parity tests that run both implementations against identical inputs (recommended)
2. Import from core and let Rollup tree-shake/inline (eliminates duplication but couples worker
   build to core's module graph, may pull in unwanted dependencies)
3. Extract shared pure functions to a separate entry point designed for dual consumption

**CSP requirement:**
Sites need `worker-src 'self' blob:;` (or fallback via `child-src`, then `script-src`, then
`default-src` per the CSP spec). Note: adding `blob:` to `script-src` as a workaround is
discouraged because it broadens script execution policy beyond what's needed. The `workerUrl`
option avoids `blob:` entirely for strict-CSP environments.

When CSP blocks the worker, creation may fail synchronously (caught by `try/catch`) or
asynchronously (caught by `onerror` handler). The implementation handles both.

**Known issues from code review (4-model tribunal):**

| Issue | Severity | Agreed By | Status |
|-------|----------|-----------|--------|
| Tests don't execute real worker script | High | 4/4 | Needs parity tests |
| Code duplication drift risk | High | 4/4 | Needs mitigation |
| Structured clone cost not benchmarked | High | 4/4 | Ship blocker |
| Header precedence inconsistency (Content-Encoding) | Medium | 3/4 | Fix in worker |
| In-flight worker sends during page-hide | Medium | 3/4 | See lifecycle section |
| `resolveUrl()` changes behavior for direct path too | Medium | 1/4 | Fix: only resolve in worker path |
| Async header resolution race with visibility change | Medium | 1/4 | Fix: resolve headers before checking worker |
| No worker termination on transport disposal | Low | 1/4 | Add cleanup hook |
| `workerScript.generated.ts` absent in clean checkout | Low | 2/4 | CI check or commit generated file |

**Page lifecycle and in-flight sends:**
When the page transitions to hidden while the worker has an in-flight fetch, that request may
be killed before completion. The main thread cannot know whether the worker's fetch reached the
network, so retrying via direct keepalive risks duplicate telemetry. Current design: accept
possible loss for in-flight worker sends during page-hide. New sends during hidden state use the
direct path with `keepalive: true`. This is a common tradeoff for worker-based transports.
Loss rate should be measured in production before deciding if a more complex solution (e.g.
ack-before-fetch protocol) is warranted.

**Pros:**
- Moves serialization, compression, and fetch off the main thread (net benefit depends on
  structured clone being cheaper than stringify, which needs measurement)
- Preliminary benchmarks show 18-35% reduction in app API tail latency under 20x CPU throttle
  (see "Benchmark Caveats"; these are early results, not validated on real devices)
- Opt-in with zero impact on existing users
- Graceful fallback on startup and eligibility failures (CSP, missing Worker API, clone errors,
  hidden page, AbortSignal). Note: in-flight worker sends during page-hide may be lost; this is
  an accepted tradeoff, not a fallback. See "Page lifecycle" section.
- Worker is persistent (no startup cost per flush after init, but first-flush latency includes
  worker script parsing and thread warm-up)
- Compression runs in worker too, compounding the benefit
- `workerUrl` option available for strict-CSP environments

**Cons:**
- ~50 lines of duplicated pure logic with drift risk
- Requires `blob:` in CSP `worker-src` (unless using `workerUrl`)
- Adds build step (Rollup + Terser for worker compilation)
- `postMessage` structured clone has overhead; for large payloads this may itself be a
  significant main-thread cost (THE key risk to measure)
- For small payloads (<1KB) the worker path may be slower than direct. If small-payload
  benchmarks confirm a regression, options: add a payload-size threshold for automatic routing,
  restrict worker path to replay-containing batches only, or accept the overhead since
  `enableWorker` is opt-in and users presumably have large payloads
- Worker thread consumes additional memory (~2-5MB for the thread itself)
- More complex error/fallback paths to maintain and test
- Worker fetches appear under the worker context in DevTools, which may confuse debugging
- Generated worker script ships in the bundle for all users (even those who don't enable it),
  increasing bundle size by ~2-3KB gzipped. Bundlers cannot tree-shake it today.

### Proposal 1b: Worker-Owned Queue (Variant)

Instead of batching on the main thread and posting the whole batch at flush time, post each
transport item to the worker individually as it's produced. The worker owns the batch queue,
flush timer, serialization, and fetch.

```
Main thread                                Worker thread
--------------------------------------------  -------------------------
Instrumentation captures event
  -> postMessage({type:'item', item})     ->  queue.push(item)
                                              // ... more items arrive ...
                                              // flush timer fires
                                              getTransportBody(queue)
                                              JSON.stringify(body)
                                              compress + fetch
  <- postMessage({type, status})          <-
```

**Pros:**
- Distributes structured clone cost across many small messages instead of one large spike
- Worker owns more of the transport lifecycle, reducing main-thread work
- Batch semantics live in one place (the worker)

**Cons:**
- More messages across the boundary (higher total overhead, though each is small)
- Fallback becomes harder: items already in the worker queue can't easily be retrieved if
  the worker crashes. Need a protocol for "drain back to main thread" or accept loss.
- Rate-limit, session, and metadata state must be synchronized differently
- Page-hide flush requires telling the worker to flush immediately and waiting for completion,
  or accepting loss
- Dynamic headers must be resolved per-flush, requiring a round trip at flush time
- Harder to reason about ordering and exactly-once delivery
- Significantly more protocol complexity than Proposal 1

**Verdict:** Worth considering if Proposal 1's structured clone cost at flush time turns out to
be too high. The per-item clone is cheap (individual items are small). But the added protocol
complexity is substantial. Benchmark Proposal 1's clone cost first; if it's acceptable, the
simpler flush-time design is preferable.

### Proposal 2: Main-Thread Scheduling (`scheduler.postTask` / `requestIdleCallback`)

Use the browser's scheduling APIs to defer serialization to idle periods or lower-priority
task queues.

```typescript
await scheduler.postTask(() => {
  const body = JSON.stringify(getTransportBody(items));
  return fetch(url, { body, ... });
}, { priority: 'background' });
```

**Pros:**
- No CSP implications
- No code duplication
- No build pipeline changes
- No worker memory overhead
- Simpler code (one scheduling wrapper)

**Cons:**
- Native `JSON.stringify` is atomic and cannot be interrupted. A 20ms stringify is a 20ms long
  task regardless of when it's scheduled. This defers the jank but doesn't eliminate it.
- `scheduler.postTask` support: Chrome 94+, Firefox (recent versions). Safari still missing.
- `requestIdleCallback` deadline is up to 50ms (not guaranteed), and callbacks can overrun.
  The real issue: idle time may not exist during heavy mutation periods.
- During page unload there's no idle time, so lifecycle flushes can't use this path
- "Schedule for later" conflicts with batch flush semantics (the batch already waited, now we
  wait again)

**Verdict:** Scheduling changes *when* the work runs, not *where*. The main thread is still
blocked for the same duration during the task. Doesn't solve the core problem for native
stringify.

### Proposal 3: SharedWorker / ServiceWorker

Use a SharedWorker (shared across tabs) or ServiceWorker (persistent, supports offline) instead
of a dedicated Worker.

**Pros:**
- SharedWorker: single worker instance across multiple tabs, lower total resource usage
- ServiceWorker: survives page close, could batch across navigations, offline support
- ServiceWorker: no `blob:` CSP issue (registered by URL)

**Cons:**
- SharedWorker: same `blob:` CSP requirement, more complex lifecycle (connect/disconnect for
  multiple ports), limited browser support
- ServiceWorker: requires a hosted JS file at a known URL (breaks the "no external assets"
  goal), registration is async and may not be ready for first flush, scope restrictions,
  significant API complexity
- Both: much harder to test, debug, and reason about lifecycle
- Both: overkill for the problem. We don't need cross-tab coordination or offline support.

**Verdict:** Adds significant complexity for capabilities we don't need. A dedicated Worker is
the right scope for "move CPU work off the main thread."

### Proposal 4: Payload Chunking / Streaming

Split large batches into smaller chunks that serialize quickly, sending multiple smaller
requests instead of one large one.

**Pros:**
- No CSP implications
- No worker overhead
- Each individual stringify is fast
- Reduces peak memory (no single large JSON string)

**Cons:**
- Increases request count (more HTTP overhead, more rate-limit pressure)
- Doesn't help with individual large items (one rrweb full snapshot can be 50KB+)
- `getTransportBody` merges trace spans; chunking breaks this semantic
- The collector API would need to accept split batches. Multiple valid POSTs may be acceptable
  even without protocol changes, but ordering and partial-failure semantics get complex.
- Adds protocol complexity: ordering, dedup, partial-failure handling

**Verdict:** Doesn't help for the primary use case (individual large replay events). Protocol
complexity for marginal benefit. Could complement a worker approach for very large batches.

### Proposal 5: Pre-Serialization in Instrumentation

Serialize replay events to JSON strings at capture time (inside rrweb's mutation observer
callback), spreading the cost across many small increments rather than one big batch flush.

**Pros:**
- Spreads serialization cost over time
- No CSP or worker complexity
- Batch flush becomes cheap (just concatenate pre-serialized strings)

**Cons:**
- Pushes complexity into every instrumentation that produces large payloads
- rrweb events include metadata added at transport time (session ID, timestamps); can't
  fully pre-serialize. Payload arrays could be pre-serialized and wrapped with final metadata,
  but this adds contract complexity and invalidation logic.
- Mutation observer callbacks are already performance-sensitive; adding stringify there may
  be worse than batching
- Requires changes to the transport item contract (string vs object payloads)
- Doesn't help with compression

**Verdict:** Interesting for future optimization but invasive, doesn't solve the whole problem,
and requires cross-cutting changes to the instrumentation/transport contract.

### Proposal 6: Transport-Layer Lazy Serialization

Serialize items between capture and flush using idle time. Each time an item is enqueued,
schedule its serialization via `requestIdleCallback` or `scheduler.postTask`. By flush time,
most items are already serialized strings. The flush just concatenates and sends.

```typescript
// On item enqueue:
requestIdleCallback(() => {
  item._serialized = JSON.stringify(item.payload);
});

// On flush:
// Most items already have _serialized; only serialize stragglers
const body = buildBodyFromCachedStrings(items);
fetch(url, { body, ... });
```

**Pros:**
- No worker, no CSP, no build pipeline changes
- Spreads serialization cost without touching instrumentation code
- Individual item serialization is small and fast (can be interrupted between items)
- Flush becomes mostly string concatenation
- Works everywhere

**Cons:**
- Relies on idle time existing between capture and flush. During heavy mutation bursts (exactly
  when the problem is worst), there may be no idle time, so items arrive at flush un-serialized
- Cache invalidation: if transport metadata is added or modified between serialization and flush,
  cached strings are stale. Requires careful invalidation or accepting slightly stale metadata.
- Increases memory: each item holds both the object and its serialized string until flush
- Custom JSON assembly (wrapping pre-serialized payload strings into the envelope) is error-prone
  and must preserve exact JSON shape/escaping
- Doesn't help with compression (still happens at flush time)
- Large individual items (full rrweb snapshots) still block during their individual
  serialization, just not as long as the whole batch

**Verdict:** Viable for reducing average-case flush cost, but doesn't reliably help in the
worst case (heavy mutation bursts where idle time is scarce and individual items are large).
Could complement a worker approach as a future optimization.

### Proposal 7: Serialize in Worker, Fetch on Main Thread

Use a worker only for CPU-heavy body construction (serialize + compress), then transfer the
result back to the main thread for `fetch()` with existing keepalive/session/rate-limit
handling.

```
Main thread                               Worker thread
-------------------------------------------  -------------------------
postMessage({items})                    ->  getTransportBody(items)
  [structured clone of items]               JSON.stringify(body)
                                            compress(body)
<- postMessage(resultBlob, [transfer])  <-
fetch(url, {body: resultBlob, keepalive, ...})
```

**Pros:**
- Keeps all fetch/response/session/rate-limit logic on the main thread (less duplication)
- Better page-hide handling: main thread owns the fetch with `keepalive`
- Simpler worker (just a serialization/compression service)

**Cons:**
- Still pays structured clone cost for items going to the worker
- Returning the result is another boundary crossing. Transferring a Blob or ArrayBuffer avoids
  clone, but the worker must encode to a transferable format.
- Main thread still does fetch setup, response handling (the async parts are cheap, but this
  doesn't move them off-thread)
- Two boundary crossings per flush instead of one
- If the main benefit is from moving stringify, this captures that. If compression is also
  significant, this captures that too. The fetch itself is async and unlikely to be the main
  contributor to long tasks.

**Verdict:** A reasonable middle ground that avoids much of Proposal 1's duplication. Worth
considering if `fetch`-side duplication in the worker proves problematic. The double boundary
crossing is the main downside. Benchmark to see if the simpler worker with round-trip is fast
enough.

## Rejected Alternatives

These were considered and rejected. Documented here so reviewers don't re-derive them.

**Transferable ArrayBuffer transfer.** The items array contains nested JS objects (not
ArrayBuffers), so they can't be directly transferred. To use transferables, you'd need to
serialize to bytes first on the main thread (e.g. `TextEncoder.encode(JSON.stringify(...))`),
then transfer the buffer. But that moves serialization back to the main thread, which is the
problem we're solving. Transferables are useful for returning results FROM the worker (e.g.
Proposal 7), but don't help with sending items TO the worker.

**WASM-based serialization (e.g. simd-json).** WASM JSON serializers still need to traverse JS
objects and copy data into linear memory. The JS/WASM boundary crossing for deeply nested
objects is unlikely to be faster than native `JSON.stringify`. Also adds a 50-100KB+ WASM
binary to the bundle, which conflicts with SDK size goals.

**SharedArrayBuffer / ring buffer.** Requires cross-origin isolation (`COOP`/`COEP` headers),
which most SDK consumers don't have. Also requires representing payloads as fixed-size binary,
which doesn't match the variable JSON structure. Not viable for a general-purpose SDK.

**Binary protocol (protobuf/CBOR/MessagePack).** Reduces payload size and potentially
serialization cost, but requires collector API changes and adds a serialization dependency.
Orthogonal to the transport threading question and a much larger scope change.

**navigator.sendBeacon as primary transport.** Limited to 64KB total queued payload, no custom
headers (can't send `x-api-key`), no response handling (can't detect 429 or session expiry),
fire-and-forget only. Already used implicitly via `keepalive` on the direct path for lifecycle
flushes. Not suitable as a primary transport mechanism.

**MessageChannel for worker protocol.** `MessageChannel` provides dedicated ports but still
uses structured clone for messages. It doesn't change performance characteristics. Could improve
protocol clarity (backpressure, cancellation) but adds complexity. Not worth it for the current
simple request/response pattern. Worth revisiting if Proposal 1b is pursued.

**Incremental/streaming JSON serializer.** A custom serializer could yield between items via
`scheduler.yield()` or `setTimeout(0)`. This avoids the worker entirely. However: requires
implementing a correct JSON serializer (complex, error-prone), likely slower total CPU than
native stringify, and still can't yield within a single large item's serialization. The
individual rrweb snapshot is the problem, not the batch envelope.

**Capture-time payload reduction (rrweb tuning).** Approaches like delta encoding, mutation
coalescing, DOM pruning, `slimDOMOptions`, adaptive replay quality, and structural sharing
would reduce payload sizes at the source. This directly addresses the root cause and is
worth pursuing independently. It's not an alternative to transport optimization because:
(a) it requires changes to the replay instrumentation, not the transport, (b) payloads will
always grow as we add features, and (c) even with smaller payloads, moving serialization
off-thread is a good architectural direction. Listed as adjacent/complementary, not competing.

**Optimize `getTransportBody` on the main thread.** The existing implementation uses object
spread (`body = { ...body, [bk]: [...signals, item.payload] }`), which is O(N^2) for large
batches. The worker version uses direct mutation, which is O(N). Backporting this optimization
to `@grafana/faro-core` is worth doing regardless. However, `JSON.stringify` is the dominant
cost (not `getTransportBody`), so this alone doesn't solve the problem.

## Benchmark Data

Tested worker vs direct transport. Stress-test: 100x12 table with nested elements, ~50% cell
updates at 60fps, continuous API calls to a Go backend, rrweb replay enabled. 5 runs per mode,
20x CPU throttle in Chrome DevTools.

| Metric | Worker | Direct | Delta |
|--------|:------:|:------:|:-----:|
| p50 | 749 ms | 912 ms | -18% |
| p95 | 1,128 ms | 1,702 ms | -34% |
| Mean | 739 ms | 942 ms | -22% |
| Max | 1,235 ms | 1,902 ms | -35% |

**What's measured:** end-to-end latency of app API calls (request to response) to the Go
backend, while Faro transport flushes compete for the main thread.

**Why API latency, not direct transport cost?** The user-facing impact of transport jank is
degraded app responsiveness, which manifests as increased API tail latency and reduced frame
rates. API latency is the proxy for "how much is Faro hurting the app."

Long task count was roughly the same (~86 vs ~88). DOM mutation work dominates long task count.
The worker's benefit is from reduced main-thread contention: stringify + fetch no longer compete
with the app's own event handlers and network calls for main-thread time. This shows up as
reduced tail latency spikes rather than fewer long tasks.

On unthrottled fast hardware (M5 Mac): no measurable difference.

### Benchmark Caveats

- **5 runs is low** for tail-latency claims. Future benchmarks should use 20+ runs with
  confidence intervals and randomized ordering.
- **20x CPU throttle is extreme.** Useful for exposing problems but absolute numbers don't
  represent real devices. Need benchmarks on real mid-tier Android (e.g. Moto G Power) and
  moderate throttle (4-6x).
- **Missing baselines:** No "Faro disabled" or "Faro without replay" baselines, so we can't
  precisely attribute the improvement to transport offload vs other factors.
- **Compression state unknown.** The benchmark doesn't specify whether `requestCompression`
  was enabled. Should test both.

### Required Benchmarks Before Shipping

These are ship blockers, not nice-to-haves:

1. **Structured clone cost of `postMessage(items)`** for representative rrweb payloads (1KB,
   10KB, 50KB, 100KB, 500KB batches). Measured as main-thread blocking time. If clone cost
   approaches stringify cost, reconsider Proposal 1b or 7.
2. **Small-payload regression test.** Compare worker vs direct for typical log/event batches
   (<1KB) to confirm the worker path doesn't regress lightweight workloads.
3. **Worker memory overhead.** Heap snapshots showing baseline worker cost and peak memory
   during flush (items clone + JSON string + compressed Blob may coexist briefly).
4. **First-flush latency.** Time from `new Worker()` to first successful send. Includes script
   parsing, thread warm-up, and first message round trip.
5. **Real device testing.** Chrome on mid-tier Android (Moto G Power or equivalent) with
   session replay enabled. Both with and without compression.
6. **Long task attribution.** Use Performance Observer with `longtask` entry type to show which
   long tasks moved or shrank with the worker, not just total count.

## Consensus

**Recommended: Proposal 1 (Dedicated Web Worker), conditional on benchmark results.**

The problem is real and measured. Scheduling APIs (Proposal 2) can't fix atomic `JSON.stringify`
blocking. SharedWorker/ServiceWorker (Proposal 3) are overkill. Payload chunking (Proposal 4)
doesn't help for large individual items. Pre-serialization (Proposal 5) is invasive. Lazy
serialization (Proposal 6) doesn't reliably help in the worst case. Serialize-in-worker (Proposal
7) is a viable fallback if worker-side fetch proves too complex.

A dedicated Web Worker with blob URL inlining is a well-established approach for moving
CPU-heavy work off the main thread. Similar patterns are used by some browser-based
observability SDKs. The opt-in design and fallback mechanisms make the risk profile acceptable.

**The recommendation is conditional.** If structured clone benchmarks show that `postMessage`
cost approaches `JSON.stringify` cost for large rrweb payloads, pivot to Proposal 1b
(worker-owned queue with per-item posting) or Proposal 7 (serialize in worker, fetch on main).

**Ship gates:**
1. Structured clone cost benchmarked and acceptable (< 50% of stringify cost for target payload)
2. Small-payload regression confirmed absent
3. Parity tests for duplicated serialization logic passing in CI
4. Header precedence consistency between worker and direct paths
5. `resolveUrl()` only applied in worker path
6. Async header race condition resolved
7. `workerUrl` option implemented for strict-CSP environments
8. Page-hide in-flight loss rate measured and documented
9. Worker cleanup on transport disposal
10. Bundle size impact measured and acceptable

## Other Notes

### References

- [PR #2073: feat(web-sdk): offload transport to Web Worker](https://github.com/grafana/faro-web-sdk/pull/2073)
- [Issue #2072: tracking issue](https://github.com/grafana/faro-web-sdk/issues/2072)
- [PR #2028: gzip compression feature](https://github.com/grafana/faro-web-sdk/pull/2028)
- [Web Workers API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)
- [CSP worker-src directive (MDN)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/worker-src)
- [Structured Clone Algorithm (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm)

### Implementation Notes

The existing PR (#2073) implements Proposal 1. Code review by a 4-model tribunal (Claude Opus,
Codex o3, Gemini 3.1 Pro, GPT 5.5) identified the issues listed in the "Known issues" table.
All four models agreed the approach is architecturally sound. All CodeQL security findings were
unanimously assessed as false positives for same-origin blob workers. The design doc was then
reviewed by the same tribunal, which identified the additional alternatives and benchmark gaps
incorporated into this revision.

### Security Assessment

CodeQL flagged three issues on the PR, all false positives:

1. **Remote property injection** (`Object.assign(fetchHeaders, msg.headers)`): headers come from
   SDK config on the main thread, not untrusted input. Hardening: use `Object.create(null)` for
   the header dict.
2. **Missing origin verification** (`self.onmessage`): dedicated workers created from blob URLs
   only receive messages from their creator. Not comparable to `window.postMessage` cross-origin.
3. **Client-side request forgery** (`fetch(msg.url)`): URL comes from `FetchTransportOptions.url`
   set at SDK init. Same URL the direct path already fetches.

Broader security consideration: recommending `blob:` in `worker-src` may be a non-starter for
strict enterprise environments. The `workerUrl` option addresses this by allowing a static
same-origin worker file that doesn't require `blob:`.

### Bundle Size Impact

TBD. The worker script is minified via Terser. Expected to add ~2-3KB gzipped to the SDK
bundle (the worker string literal). This ships for all users even if they don't enable the
worker. Should be measured before shipping. Tree-shaking the worker string when `enableWorker`
is not used is not currently possible due to the static import chain. Dynamic `import()` of the
worker module is a future option to eliminate this cost for non-users but adds async
initialization complexity.

### Observability

The SDK should track worker transport state internally for debugging:
- Worker initialization success/failure and reason
- Fallback events and reasons (CSP, crash, hidden, clone error)
- Worker path vs direct path usage ratio

These should be available via the existing SDK debug logging. Consider exposing an internal
counter or callback so users can verify the worker is active.
