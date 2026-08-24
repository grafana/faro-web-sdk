# Reliable Fetch transport (v2), behind an experimental flag

Status: implemented.

Related: [#2243](https://github.com/grafana/faro-web-sdk/issues/2243),
[#2241](https://github.com/grafana/faro-web-sdk/issues/2241),
[kwl-endpoint#1763](https://github.com/grafana/app-o11y-kwl-endpoint/issues/1763),
[kwl-endpoint#1773](https://github.com/grafana/app-o11y-kwl-endpoint/issues/1773)

## Problem Statement

When a Faro batch fails to reach the collector, it is lost. A transient network blip, a collector
restart, or a rate-limit response destroys the affected batch with no second attempt. For logs and
exceptions this shows up as gaps in dashboards. For session replay it is worse: a single lost batch
can leave a recording permanently incomplete, because a missing checkpoint or incremental event
cannot be reconstructed from the batches that did arrive.

The existing rate-limit handling makes this sharper rather than softer. A single HTTP 429 sets a
transport-wide backoff deadline, and until that deadline passes every new batch is dropped outright
rather than held. So the one condition where the collector is explicitly asking the client to slow
down is also the condition where the client throws data away fastest.

Application developers cannot tune any of this. There is one option covering the rate-limit backoff
interval, and nothing else: no attempt count, no backoff schedule, no way to trade memory for
delivery reliability on a page where that trade would be worth making.

## Solution

A second implementation of the Fetch transport that treats delivery as a bounded, retried operation
instead of a single attempt, offered to application developers behind an experimental configuration
flag while it earns confidence in the field.

When enabled, a batch that fails for a reason that could plausibly succeed later is held and
redelivered on a bounded backoff schedule. When the collector states how long to wait, that
instruction is honoured, within a configured ceiling. Batches waiting for redelivery live in a
bounded queue, and when that queue is full the transport declines new work rather than discarding
work it already accepted — so the oldest signals, the ones a replay recording depends on, are the
ones that survive.

Crucially, one batch's rate-limit response no longer silences the whole transport. There is no
global "stop sending" deadline; each batch carries its own redelivery schedule, and a shared
throttle plus jitter keeps a group of waiting batches from returning as a single burst.

The existing transport stays exactly as it is and remains the default. Developers who want the new
behaviour opt in explicitly; everyone else sees no change whatsoever.

## User Stories

### Opting in and out

1. As an application developer, I want to enable the reliable transport with a single experimental
   configuration flag, so that I can try improved delivery without restructuring my Faro setup.
2. As an application developer, I want the flag to be clearly marked experimental, so that I
   understand the behaviour may change before it becomes the default.
3. As an application developer who has not set the flag, I want my delivery behaviour to be
   byte-for-byte unchanged, so that adopting a new SDK version carries no delivery risk.
4. As an application developer, I want to turn the flag off again and immediately return to the
   previous behaviour, so that I can roll back without a version downgrade.
5. As an application developer who supplies my own transports explicitly, I want a clear error when
   I set the flag but it cannot take effect, so that I am not left believing I opted in when I did
   not.
6. As a Faro maintainer, I want the new implementation kept entirely separate from the existing one,
   so that work on it cannot regress the default path.
7. As a Faro maintainer, I want promoting the new implementation to the default to be a one-line
   change with no rename, so that graduation does not force a breaking change on consumers.
8. As an operator reading console output, I want log lines to identify which transport
   implementation produced them, so that I can attribute behaviour correctly while both exist.

### Retrying a failed delivery

1. As an application developer, I want a batch that failed for a transient reason to be retried
   automatically, so that a brief network interruption does not cost me telemetry.
2. As an application developer, I want retries to be bounded by a maximum attempt count, so that a
   persistently failing collector cannot cause unbounded work.
3. As an application developer, I want successive retries to back off exponentially, so that a
   struggling collector is given room to recover.
4. As an application developer, I want backoff delays to be jittered, so that many clients
   recovering at once do not synchronise into a thundering herd.
5. As an application developer, I want the backoff schedule to have a maximum delay, so that the
   wait between attempts cannot grow without limit.
6. As an application developer, I want to configure the attempt count, initial backoff, maximum
   backoff, and backoff multiplier, so that I can match the policy to my application's tolerance
   for latency and memory.
7. As an application developer, I want sensible defaults for every retry setting, so that enabling
   the flag alone gives me good behaviour without further tuning.
8. As an application developer, I want a response that cannot succeed on retry to fail immediately,
   so that the SDK does not waste a mobile user's battery and data retrying a rejected payload.
9. As an application developer, I want a batch that succeeded to never be sent a second time, so
   that a successful delivery cannot be duplicated by the retry machinery.
10. As an application developer, I want retries to preserve the exact request the first attempt
    made, so that a retry cannot succeed with different content than what was intended.

### Honouring the collector's instructions

1. As an SRE running the collector, I want the client to honour the wait interval my rate limiter
   advertises, so that clients return when my limiter window has actually reset.
2. As an SRE, I want the collector's stated wait interval to take precedence over the client's
   configured backoff, so that my server-side capacity decisions win over client defaults.
3. As an SRE, I want clients whose wait intervals expire together to return spread out rather than
   simultaneously, so that my limiter is not hit by a synchronised burst the moment the window
   resets.
4. As an application developer, I want a stated wait interval that exceeds my configured ceiling to
   be capped, so that a misconfigured or hostile intermediary cannot make my transport hold data
   indefinitely.
5. As an application developer, I want a batch whose stated wait interval exceeds my ceiling to be
   dropped rather than held, so that memory is not spent for minutes to eventually deliver stale
   telemetry.
6. As an application developer, I want a malformed or nonsensical wait interval to be ignored in
   favour of my configured backoff, so that untrusted input cannot alter my delivery schedule.
7. As an application developer, I want one batch's rate-limit response to not silence delivery of
   unrelated batches, so that a single throttled request does not blank out my telemetry.

### Bounded memory and backpressure

1. As an application developer, I want the number of batches awaiting redelivery to be bounded, so
   that a collector outage cannot exhaust my page's memory.
2. As an application developer, I want the redelivery queue to be bounded separately from the
   in-flight request budget, so that waiting retries cannot starve newly produced telemetry of
   admission.
3. As an application developer, I want a batch that was already accepted for delivery to never be
   rejected later, so that accepting work is a real commitment rather than a provisional one.
4. As an application developer whose queue is full, I want new batches declined and already-queued
   batches kept, so that the earliest signals — the ones a replay recording depends on — survive.
5. As an application developer, I want the queue drained oldest-first, so that signal ordering is
   preserved as far as delivery allows.
6. As an application developer, I want a batch that will be declined to be declined before it is
   serialized and compressed, so that my users' devices do not spend CPU and memory preparing work
   that is about to be thrown away.
7. As an application developer making many concurrent calls, I want the queue bound respected
   exactly, so that concurrency cannot cause the transport to overshoot the limit I configured.
8. As an application developer running two isolated Faro instances on one page, I want their
   delivery state kept separate, so that one application's rate-limit event does not throttle the
   other's telemetry.

### Duplicate delivery

1. As an SRE, I want each batch to carry a stable identifier that is identical across every attempt,
   so that the collector can recognise and discard a redelivered batch.
2. As an SRE, I want that identifier to differ between distinct batches, so that unrelated batches
   are never mistaken for duplicates of one another.
3. As a data consumer, I want retried batches to not inflate exception counts or measurement sums,
   so that dashboards remain trustworthy once retries are enabled.

### Diagnostics

1. As an operator, I want an error logged when a batch is finally given up on, so that data loss is
   visible rather than silent.
2. As an operator, I want that error to say why delivery failed and how many attempts were made, so
   that I can tell a collector outage from a client misconfiguration.
3. As an operator, I want a batch declined because the queue was full to be reported as data loss,
   so that local backpressure is not mistaken for a healthy state.
4. As an operator, I want intermediate retry activity kept out of the default log level, so that a
   recovering network does not fill my console with noise.
5. As a privacy-conscious developer, I want failure diagnostics to exclude the payload, so that
   telemetry content is never written to the browser console.

### Page lifecycle

1. As an application developer, I want a best-effort attempt to flush queued batches when the page
   is being unloaded, so that a user closing a tab does not automatically lose everything queued.
2. As an application developer, I want no retry scheduling attempted during unload, so that the SDK
   does not rely on timers that will never run.
3. As an end user of an instrumented application, I want telemetry never written to disk without my
   knowledge, so that closing a tab does not leave data behind.

### Maintainability

1. As a Faro maintainer, I want the queueing, throttling, and backoff logic written without any
   dependency on the Fetch API, so that the OTLP transport can adopt it later by moving a module
   rather than copying it.
2. As a Faro maintainer, I want the retry logic deterministic under an injected clock and injected
   randomness, so that its behaviour is testable without waiting on real time.

## Implementation Decisions

### Module layout and reachability

- The reliable transport is a **new module sibling to the existing Fetch transport module**, not a
  modification of it. Both implementations exist in the tree simultaneously and share no code.
- The new class **keeps the same class name** as the existing transport. This is possible only
  because it is **not added to the package's public export barrel** — re-exporting two identically
  named symbols from the single public entry point is a compile error, and the package exposes no
  subpath exports that would provide a second entry point.
- Consequently the new transport is **not publicly constructible**. It is reachable only through the
  configuration flag. This is accepted for the experimental phase.
- Graduation is a **one-line change to the export barrel**, swapping which module the public name
  resolves to. The public name never changes and no consumer breaks.
- The new transport declares a **distinct `name` property**, suffixed to mark it as the second
  implementation. This value prefixes every internal log line, and attributing field behaviour to
  one of two implementations is the entire point of running them side by side.

### Selection

- Selection happens in the **web SDK's configuration factory**, which already constructs the default
  Fetch transport when the caller supplies a collector URL. The experimental flag is in scope at that
  point, before construction, so the choice is a **class selection at construction time**.
- This deliberately avoids reading configuration inside the transport: configuration is injected into
  a transport _after_ construction, so an in-transport branch would have to defer every decision to
  send time.
- This mirrors the existing precedent for experimental flags, where the flag decides which
  instrumentation is _present_ rather than altering an instrumentation's behaviour.
- If the flag is set **and** the caller supplied explicit transports, the factory logs an **error**.
  The flag cannot take effect on that path, and a silent no-op would be indistinguishable from
  working.
- Both implementations are statically referenced by the factory, so both ship in the bundle for the
  duration of the experimental phase. Accepted.

### Retry policy surface

- The new transport's options expose a retry policy object, modelled on the collector-side retry
  policy vocabulary. Durations are plain millisecond numbers, not duration strings — a string format
  would buy a parser, a validation surface, and error messages for no benefit to a TypeScript
  consumer.

  ```ts
  interface RetryOptions {
    maxAttempts?: number;
    initialBackoffMs?: number;
    maxBackoffMs?: number;
    backoffMultiplier?: number;
  }
  ```

- **`retryableStatusCodes` is deliberately not exposed.** Exposing it would let a caller add statuses
  that can never succeed (wasting battery and data on mobile) and remove the rate-limit status,
  silently breaking the contract with the collector. The set stays internal and can be exposed later,
  with validation, if a concrete need appears.
- **No total-elapsed-time option.** Retention is bounded by the interaction of attempt count, maximum
  backoff, and the wait-interval clamp described below, rather than by a separate deadline field.
- The previous rate-limit backoff option is **removed** from the new transport's options. Its role is
  subsumed by the retry policy, because the concept it served — a transport-wide gate — no longer
  exists.

### Retry semantics

- **The transport-wide backoff deadline is removed entirely**, along with the generation counter that
  coordinated batches against it. Nothing causes one batch's failure to suppress another's delivery.
- Redelivery is **per batch**. Each waiting batch carries its own schedule.
- A collector-stated wait interval **takes precedence** over the configured backoff when present and
  parseable. Otherwise the configured exponential schedule applies.
- A stated wait interval is **clamped to the configured maximum backoff**. If the stated value
  _exceeds_ that maximum, the batch is **dropped immediately** rather than held. Dropping is
  preferred over holding because holding spends memory for an extended period to eventually deliver
  telemetry that has lost most of its value, and because it is what bounds retention now that there
  is no total-elapsed-time option.
- A malformed, unparseable, or out-of-range wait interval is ignored; the configured backoff applies.
- A **throttle scoped to the transport instance** — a token bucket or an earliest-next-send timestamp
  — gates releases from the queue, and **every release is jittered**. Without this, honouring a
  server-stated interval gives every waiting batch the same deadline, so they would all return as one
  burst into a freshly reset limiter window. The existing concurrency bound meters what the throttle
  releases.
- The throttle is **per instance, not module-global**. Isolated Faro instances exist precisely so that
  two applications on one page do not interfere; module-global delivery state would couple them.
- The keepalive request budget accounting is retained, including the byte-accurate body sizing.

### Queue and admission

- **Two independent bounds.** The existing in-flight/admission budget keeps its current default. The
  redelivery queue gets its **own bound, defaulting to 60 batches** — roughly fifteen seconds of
  production at the default batching cadence. Any value is a partial-loss decision during a sustained
  outage; this one is chosen as a memory budget, not as coverage of a limiter window.
- The bound is by **batch count**, accepting that this does not bound bytes: the per-batch signal
  limit caps signal count, not payload size, so an exception with a deep stack or a replay batch can
  be far larger than a typical log batch.
- Because the queue is bounded separately, **the overflow-admission escape hatch on the shared
  promise buffer is not needed and is not used** by this transport. An already-accepted batch can
  never be rejected on re-entry, and waiting retries can never starve new admissions.
- **Overflow declines new work.** Nothing already queued is evicted. This preserves the earliest
  batches, which is the correct bias for replay recordings.
- The queue **drains oldest-first**, consistent with the overflow policy.
- **Capacity is reserved, not checked.** A queue slot is claimed synchronously at the start of the
  send path, before the first asynchronous operation, then serialization and compression run, then
  the reservation is either filled or released. Release is idempotent and runs unconditionally,
  matching the discipline the existing keepalive reservation already uses.

  This ordering is load-bearing twice over. It ensures a batch that will be declined is never
  serialized or compressed — which matters because declining becomes the _common_ path during an
  outage, several times a second. And it closes a time-of-check-to-time-of-use window: serialization
  and compression are asynchronous, so a plain check followed by a later enqueue would let every
  concurrent caller pass the same check and overshoot the bound by the number of concurrent sends.

### Duplicate delivery

- Each batch carries an **idempotency key** request header, using the standard header name, generated
  once when the batch's body is prepared and **identical across every attempt of that batch**,
  including the non-keepalive compatibility fallback, which issues a separate request.
- The key is **the explicit exception** to re-resolving request headers per attempt. A comment at the
  generation site should say so, because a later refactor that "fixes" header staleness would
  otherwise silently break idempotency.
- This addresses duplicate delivery at its root, so no attempt-count asymmetry between ambiguous
  network failures and server errors is needed as a mitigation.

### Diagnostics

- An **error** is logged only at **terminal data loss**: retries exhausted, a non-retryable response,
  or a batch declined because the queue was full. Intermediate retry activity is logged at debug.
- **No suppression, deduplication, or aggregation of these errors.** During a sustained outage this
  produces one error per declined batch, several times a second. This is accepted in exchange for
  simpler code, and revisited if it generates complaints.
- Diagnostics **exclude the payload**. They carry classification only: status or error, attempt count,
  elapsed time.
- Reported attempt counts must be **truthful and internally consistent** — a batch that never issued
  a request reports zero attempts, and every log site uses one convention.

### Page lifecycle

- On page hide, the transport makes **one best-effort keepalive flush** of the queue, with no retry
  scheduling, respecting the keepalive byte budget and declining the overflow rather than blocking.
- **No cross-page-load persistence.** Writing telemetry to browser storage would raise retention,
  privacy, and quota questions far larger than this change.

### Portability

- The queue, the throttle, and the backoff and clamp arithmetic live in a **module with no dependency
  on the Fetch API**. It accepts a "perform one attempt" callback and returns an outcome; it has no
  knowledge of responses, request initialisation, or keepalive. Only the transport itself touches
  `fetch`.
- The module stays alongside the new transport for now. Moving it to the core package later — which is
  what the OTLP transport would need, since that package depends on core and not on the web SDK — is
  then a file move plus an export line rather than a rewrite. No public API commitment is made now.

### Explicitly not changed

- The **existing transport is not modified at all**, including two defects confirmed during review of
  the earlier in-place implementation: an unclamped collector-stated wait interval that can disable
  delivery for the lifetime of a page, and an unbound logger method passed during session extension
  that raises an error after a payload has already been accepted. Both are addressed only in the new
  implementation. This is a deliberate scoping decision and a deliberate acceptance of risk on the
  default path.

## Testing Decisions

### What makes a good test here

A good test drives the transport through its public entry point and asserts on **observable effects**:
which requests were issued, with what bodies and headers, in what order, at what times, and what was
logged at which level. It does not reach into private state, does not assert on the number of internal
helper calls, and does not encode the shape of the implementation.

Determinism is mandatory and already has precedent in this area: fake timers, an injected clock, and
pinned randomness. A test whose outcome depends on real elapsed time or on unpinned jitter is a
future flake and should not be written. Every new production branch must be reachable with the clock
and randomness injected — if a branch is not reachable that way, that is a signal the branch belongs
somewhere else, not a reason to add a lower seam.

Tests must also be **meaningful under mutation**: a test named for a behaviour must fail when the
production line implementing that behaviour is reverted. Review of the earlier implementation found
two tests that passed with their subject deleted and one whose premise had no effect on its outcome;
that class of test is worse than no test, because it advertises coverage that does not exist.

### Seams

Two seams, both of which already exist in the codebase. No new seam is introduced.

1. **The transport's send entry point**, with the Fetch API stubbed and the clock and randomness
   injected. This is the high seam and covers essentially the whole feature: admission and
   reservation, queue bounds and overflow, retry scheduling, wait-interval precedence and clamping,
   the drop-above-ceiling rule, throttling and jitter, idempotency key stability, keepalive
   behaviour, unload flushing, and every diagnostic.
2. **The configuration factory**, asserting which implementation is selected for a given flag state,
   and that combining the flag with explicit transports logs an error. Direct prior art exists for
   flag-driven selection in this factory.

A third seam directly on the queue/throttle/backoff module is **deliberately rejected**. With the
clock and randomness injected, every branch in it is reachable from seam 1, and testing it directly
would assert implementation structure rather than behaviour.

### Prior art

- The existing Fetch transport suite establishes the pattern for seam 1: construct the transport,
  stub the Fetch global, inject a clock, supply mock configuration and a mock internal logger, and
  assert on recorded requests and logger calls.
- The configuration factory suite establishes the pattern for seam 2, including an existing test that
  asserts an experimental flag changes what the factory produces.
- The core promise buffer suite is the reference for bounded-admission assertions.

### Invariants worth naming as tests

- N concurrent sends against a queue with exactly one free slot admit **exactly one**; the others are
  declined. This is the time-of-check-to-time-of-use guard and it cannot be verified by inspection.
- A declined batch is **never serialized or compressed** — assert the compression path was not
  entered, not merely that no request was made.
- An already-queued batch is **never** declined on re-entry, under any interleaving.
- A stated wait interval **above** the configured maximum causes an immediate drop with **zero**
  requests issued, not a clamped retry.
- A stated wait interval **below** the maximum is honoured, and its release is jittered rather than
  landing exactly on the deadline.
- Batches sharing one wait deadline do **not** all issue requests in the same tick.
- The idempotency key is **byte-identical** across all attempts of one batch, including across the
  keepalive fallback, and **differs** between batches.
- One batch's rate-limit response does **not** prevent an unrelated batch from being delivered — the
  direct inverse of the current behaviour.
- Two isolated transport instances do not share throttle state.
- Terminal data loss logs at error; intermediate retries do not.
- Enabling the flag changes which implementation the factory returns; not enabling it returns the
  existing one unchanged.

## Out of Scope

- **Any change to the existing Fetch transport**, including the two confirmed defects noted above.
- **Public export of the new transport.** It is unreachable except through the flag, so developers
  supplying explicit transports cannot opt in. Broadening availability is deliberately deferred.
- **The OTLP transport.** It remains a third copy of rate-limit handling, still carrying an unclamped
  wait-interval parse and still logging full payloads on error. Only the portability of the new module
  is in scope; the port itself is not.
- **Collector-side work.** Emitting and exposing the wait interval, and accepting or deduplicating on
  the idempotency key, are tracked separately against the ingestion pipeline.
- **Configurable retryable status codes** and a **configurable total elapsed deadline.**
- **Duration-string configuration values.**
- **Suppression or aggregation of terminal-loss error logs.**
- **Cross-page-load persistence** of queued batches.
- **User-facing documentation** beyond the option type comments, and **promotion of the flag to
  default**, which is a later decision requiring field evidence.

## Further Notes

### Resolved decisions

1. **Per-attempt request timeout.** The timeout is a standalone transport option and defaults to
   10 seconds. The transport uses `AbortController` when available; otherwise it warns and sends
   without a timeout. No XHR fallback is introduced.
2. **Idempotency key.** The reliable transport always sends the standard idempotency-key header.
   Collector CORS support must be deployed before the SDK transport is enabled.
3. **Keepalive compatibility fallback.** A keepalive network failure is retried immediately with
   keepalive disabled inside the same logical attempt. It does not consume retry budget or depend on
   a timer.

### Which review findings this design resolves structurally

The design was derived from an adversarial review of an earlier in-place implementation. Several
findings become **unreachable by construction** rather than fixed, which is the main argument for a
separate implementation over continuing to patch:

- Removing the transport-wide deadline eliminates both the cross-batch blackout and the generation
  handshake that coordinated it — the most intricate and least testable part of the earlier state
  machine.
- Bounding the redelivery queue separately eliminates the overflow-admission escape hatch, and with it
  both the incorrect "already admitted" predicate that dropped accepted batches and the capacity
  starvation that let retained state reach many times the configured bound.
- Clamping the stated wait interval and dropping above the ceiling eliminates the poisoned-deadline
  family of failures, including the variant where an out-of-range value produced an invalid date that
  disabled the rate-limit gate permanently.
- Scoping the classification of failures to the request itself, rather than to a block that also
  contains post-success side effects, eliminates the case where an accepted response led to a
  duplicate send.

### Risk being accepted

The default path retains a remote-triggerable delivery failure: a collector-stated wait interval from
anywhere in the network path can close the rate-limit gate far into the future, after which the page
sends nothing further. The decision is to fix this only in the new implementation, which is opt-in.
No issue currently records this against the existing transport; the findings live only in the review
of the earlier branch.
