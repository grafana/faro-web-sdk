# Persistent-session concurrency

Investigation date: 2026-09-11. Follow-up to [#2267](https://github.com/grafana/faro-web-sdk/issues/2267).

Retain synchronous, best-effort persistent-session reconciliation. Concurrent renewal is reproducible in native Chromium,
but the observed tabs converged through ordinary capture, with an extra session and Replay recording in some runs. These
results justify documenting the limitation and retaining a browser regression, without introducing a storage mutex.

## Supported behavior

A tab adopts a valid stored session when its next eligible reconciliation observes it. Collector invalidation is rejected
when the request session differs from the observed memory or storage session. These checks do not make the shared
read/check/write sequence atomic. There is no guarantee of one replacement across tabs, immediate synchronization, or a
fixed convergence time or rotation count. See the [session updater][session-utils] and [response guard][transport].

The HTML standard explicitly leaves interactions between agent clusters unspecified and advises assuming no locking.
Storage notifications are queued tasks. Another `getItem()` is not an atomic conditional write or a documented freshness
barrier. See [Web Storage concurrency][storage] and [notification delivery][storage-events].

## Native browser evidence

The control used commit [`002103d`][baseline], containing the completed
[#2259](https://github.com/grafana/faro-web-sdk/pull/2259) →
[#2261](https://github.com/grafana/faro-web-sdk/pull/2261) →
[#2260](https://github.com/grafana/faro-web-sdk/pull/2260) →
[#2256](https://github.com/grafana/faro-web-sdk/pull/2256) →
[#2264](https://github.com/grafana/faro-web-sdk/pull/2264) chain, before the Web Locks lifecycle refactor.
Sources were extracted into an isolated directory and bundled with the installed Rolldown 1.2.3, resolving Faro core to
that same checkout. Versions: Faro 2.11.0, `@grafana/rrweb` 2.0.0-grafana.2, Playwright 1.62.1,
full headless Chromium **151.0.7922.34**, Linux.

Each of 25 trials created two independent pages in one browser context on the same loopback HTTP origin. Both initialized
Session and Replay instrumentations, persistent session A, sampling 1, disabled batching, and disabled Replay inactivity.
The collector held one A request per tab, then answered both with `202` and `X-Faro-Session-Status: invalid` in the same
server turn. A custom generator returned distinct tab-labelled IDs immediately. Native storage reads were unchanged;
write/remove wrappers only logged and forwarded operations. Callbacks, metadata, Replay events, and tab checkpoint
pointers were recorded. This deliberately concentrates responses and adds tracing overhead; it does not measure production
incidence. No mocked read sequence, artificial generator delay, synthetic storage event, or storage lock was used.

| Observation                                                  | Result in these 25 trials                                                   |
| ------------------------------------------------------------ | --------------------------------------------------------------------------- |
| Replacement sessions generated                               | Two in 14 trials; one in 11                                                 |
| Extra rotations relative to one replacement                  | One in 14 trials; zero in 11                                                |
| In-memory divergence after responses                         | 25/25, including the tab still holding A when its response was rejected     |
| Convergence while otherwise idle                             | None at the subsequent idle observation                                     |
| Ordinary capture after the reconciliation interval           | Both tabs adopted the same stored session in 25/25                          |
| Observed transition-to-adoption interval                     | Approximately 1.403–1.410 seconds, determined by the harness schedule       |
| `onSessionChange`                                            | Once per generated replacement; no additional callback on adoption          |
| New Replay starts across both tabs, excluding initialization | Three with two replacements; two with one replacement                       |
| Recording/session identity in 128 observed rrweb events      | No recording crossed sessions; no repeated `(recording_id, gen, seq)` tuple |

Representative two-replacement trace, relative to the first request submission:

| Time                            | Tab A                                              | Tab B                                                                   |
| ------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------- |
| 3.7 ms                          | Generates A-1 after observing native stored A      |                                                                         |
| 4.6 ms                          | Installs A-1; callback A → A-1                     |                                                                         |
| 4.7–5.8 ms                      |                                                    | Observes native stored A, generates B-1, installs B-1; callback A → B-1 |
| 6.3–7.6 ms                      | Starts a recording under A-1                       | Starts a recording under B-1                                            |
| After responses and during idle | Memory A-1, stored B-1                             | Memory B-1, stored B-1                                                  |
| 1414.6 ms                       | Next capture adopts B-1 without a session callback | Retains B-1                                                             |
| 1415.7 ms                       | Starts another recording under B-1                 | Retains its B-1 recording                                               |

The losing tab's checkpoint pointer followed its additional recording. The extra start included a fresh Meta and full
snapshot under a fresh recording ID; it did not reuse the prior recording's counters. This agrees with the control's
[session-change restart][replay] and [checkpoint selection][checkpoints]. These are observations of the old checkpoint
implementation, not validation of the replacement Web Locks lifecycle or crash recovery.

## Shared-record writers

All SDK mutations of the shared `com.grafana.faro.session` localStorage record reach the [persistent manager][manager].
Reviewing only invalidation would miss other ways a stale read can overwrite a competing tab. The following risks are
source-derived, not additional browser reproductions.

| Path                                                           | Operation and concurrent-write risk                                                                                                                    |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [Initialization][initialization]                               | Persists a new or resumed session derived from an earlier read; can overwrite another tab's renewal.                                                   |
| [Persistence expiry during initialization][initialization]     | Removes the record based on the previously read activity time; can remove a newer record written between read and removal.                             |
| [Capture, visibility, or public session update][session-utils] | Reads validity, optionally refreshes activity, and either adopts or unconditionally stores a generated replacement.                                    |
| [Collector invalidation][transport]                            | Checks request identity against memory and storage, then invokes forced renewal; competing writes can occur between those operations.                  |
| [Accepted activity][session-utils]                             | Checks matching ID and validity before writing an activity copy; can overwrite a renewal occurring after its read.                                     |
| [Metadata synchronization][session-utils]                      | Normalizes changed ID, attributes, or overrides and stores the resulting session. A metadata notification in a lagging tab can reinstate its older ID. |

The [manager][manager] reconciles on capture and visible-document activity, with the
[one-second storage interval][constants]; it does not adopt sessions directly from `storage` events. Passive metadata reads
and elapsed idle time therefore do not establish convergence. Adoption is sufficient for the tested quiescent shared
record; continued competing writes, metadata changes, clock changes, suspension, and older already-open SDK versions can
extend divergence. A fixed bound has not been established.

## Retained regression and remaining uncertainty

[The native smoke regression](../../../e2e/smoke/tests/session-concurrency.spec.ts) initializes both SDK instrumentations,
releases two real transport responses together, and verifies later captured session identity, silent adoption, and
recording/session binding. It accepts either renewal ordering and attaches observations rather than requiring the race to
occur. It passed three repeated runs against isolated control bundles.

After building the current packages, rerun it with:

```bash
yarn workspace @grafana/faro-smoke-harness e2e session-concurrency --repeat-each=3
```

The controlled Chromium results establish a practical race and extra Replay snapshots. They do not establish production
frequency, a maximum number of rotations, behavior in other engines, or that every stale writer is harmless. Keep these
limits explicit. If real traffic shows material session fragmentation, investigate all writers together before proposing
an asynchronous synchronization protocol; recording leases alone do not serialize persistent-session mutation.

[baseline]: https://github.com/grafana/faro-web-sdk/tree/002103dfc64c736a588126cd6580825e22aa2e26
[session-utils]: https://github.com/grafana/faro-web-sdk/blob/002103dfc64c736a588126cd6580825e22aa2e26/packages/web-sdk/src/instrumentations/session/sessionManager/sessionManagerUtils.ts
[transport]: https://github.com/grafana/faro-web-sdk/blob/002103dfc64c736a588126cd6580825e22aa2e26/packages/web-sdk/src/transports/fetch/transport.ts
[manager]: https://github.com/grafana/faro-web-sdk/blob/002103dfc64c736a588126cd6580825e22aa2e26/packages/web-sdk/src/instrumentations/session/sessionManager/PersistentSessionsManager.ts
[initialization]: https://github.com/grafana/faro-web-sdk/blob/002103dfc64c736a588126cd6580825e22aa2e26/packages/web-sdk/src/instrumentations/session/instrumentation.ts
[constants]: https://github.com/grafana/faro-web-sdk/blob/002103dfc64c736a588126cd6580825e22aa2e26/packages/web-sdk/src/instrumentations/session/sessionManager/sessionConstants.ts
[replay]: https://github.com/grafana/faro-web-sdk/blob/002103dfc64c736a588126cd6580825e22aa2e26/experimental/instrumentation-replay/src/instrumentation.ts
[checkpoints]: https://github.com/grafana/faro-web-sdk/blob/002103dfc64c736a588126cd6580825e22aa2e26/experimental/instrumentation-replay/src/recordingState.ts
[storage]: https://html.spec.whatwg.org/multipage/webstorage.html#introduction-16
[storage-events]: https://html.spec.whatwg.org/multipage/webstorage.html#storage-broadcast
