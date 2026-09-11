# Replay lifecycle validation

These implementation checks use the full Faro Web SDK, session instrumentation, Fetch transport,
and `@grafana/rrweb` 2.0.0-grafana.2. They extend the design experiments, which used a smaller lease
prototype. The comparison baseline is the completed PR chain at
`002103dfc64c736a588126cd6580825e22aa2e26`.

## Retained browser tests

Build the packages, start the smoke harness, and run the native tests:

```sh
yarn build
cd e2e/smoke
yarn playwright test replay-lifecycle.spec.ts --workers=1
```

The `/replay-lifecycle` fixture explicitly initializes Replay alongside the default web
instrumentations. It serves the published bundles without a development HMR client. Observations
stay in document memory; they are not checkpoint or trace writes to storage.

The tests use full Chromium with Playwright's BFCache-disabling flag removed. They assert original
document and instrumentation identity and native `pageshow.persisted` in both directions. The
freeze test uses a fresh raw Chromium process and `connectOverCDP({ noDefaults: true })` because
Playwright's focus emulation suppresses native freeze. Its temporary profile and process are
removed after the test.

| Boundary                               | Verified behavior                                                                                                         |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Navigation, repeated Back/Forward      | Both original documents restore from BFCache; one recording and increasing counters survive.                              |
| Reload and instrumentation replacement | New recorder snapshots continue the completed recording.                                                                  |
| Inactivity                             | rrweb stops while the native recording lock remains held; one interaction resumes once.                                   |
| Native freeze/resume                   | A trusted freeze event saves a clean checkpoint; trusted resume preserves document, initializer, and recording.           |
| Abandoned view-transition navigation   | Native `pageswap` followed by `window.stop()` retains the document; trusted pointer or keyboard input restarts it.        |
| Synthetic input after `pageswap`       | It does not restart recording or act as evidence of cancellation.                                                         |
| Successful skipped transitions         | Ordinary and hash-changing skipped transitions navigate with a clean handoff.                                             |
| Queued copied state                    | No rrweb starts while waiting; removal cancels the waiter; a later grant of copied active state starts a fresh recording. |
| Session change while queued            | The obsolete request is cancelled and the new session acquires its own recording.                                         |
| Storage read/write failures            | Native locks still own local counters; same-document replacement continues, and a later document splits.                  |
| Failed final checkpoint write          | The active checkpoint remains unchanged; local replacement continues, and the next document starts a new ID.              |
| Explicit stale clean copy              | Exclusive leases still permit the accepted duplicate sequence/generation tuples from independently copied counters.       |

Unit tests additionally cover metadata admission, retained capture failures, partial initialization,
stale returned stop handles, startup/checkout/deferred rrweb reentrancy, serialization gaps,
ownership supersession, cancelled grants, invalid checkpoints, and counter bounds.

## Additional native browser experiments

The implementation experiments used Chromium **151.0.7922.34** and Firefox **153**. Firefox
continued a recording through replacement, ordinary navigation, and Back reload with clean
checkpoints and unique tuples. Native Firefox BFCache restoration was not established by the
available driver; those results do not claim both-direction BFCache support in Firefox.

WebKit **26.5** also preserved recording identity and unique tuples through replacement,
navigation, Back, and Forward reloads. It ran with verified Ubuntu runtime libraries extracted
into a temporary directory, without an OS installation. Its inspector connection
[disables BFCache](https://github.com/microsoft/playwright/blob/dc0f852272a489af824b355c1db6628f366c59f0/browser_patches/webkit/patches/bootstrap.diff#L11593),
so this run does not establish WebKit or Safari BFCache restoration. Trusted `pagehide` and
`pageshow` were observed. WebKit's outgoing `pageswap` reported `isTrusted: false`; its
[event factory defaults to untrusted](https://github.com/WebKit/WebKit/blob/5e03b0c541d3895e5a12a6b032185901e5e4d738/Source/WebCore/dom/PageSwapEvent.h#L43)
and the [navigation caller omits that argument](https://github.com/WebKit/WebKit/blob/5e03b0c541d3895e5a12a6b032185901e5e4d738/Source/WebCore/dom/Document.cpp#L9094).
The fixture did not dispatch those lifecycle events. Clean handoff was verified, with this
qualification on the event's trust flag.

Chromium's actual browser tab menu was also exercised on an isolated Ozone display with a fresh
profile. The native UI command created the duplicate; neither `window.open()` nor a harness
storage write created its inherited state:

1. An active duplicate inherited the source's serialized checkpoint, waited without emitting
   Replay events, and started a new recording after the source stopped. An independently opened
   tab had a different recording.
2. A clean duplicate remained stopped while the source resumed and advanced its own counters.
   Starting the copy after source release reproduced the accepted collisions at generation 1,
   sequences 2 and 3. There were no simultaneous holders of that recording lock.
3. `Page.crash` crashed the renderer. Chromium's native Reload button reloaded the same tab with
   the old active checkpoint, a new document, and a fresh recording ID. It did not reuse lost
   counters. The native button was needed because Playwright's direct `page.reload()` rejected
   the crashed page.

The UI input was delivered through Chromium's native Views/menu testing interface, with real
menu execution and browser storage copying. It was not a physical mouse test or a Safari test.
The retained smoke tests explicitly copy active/clean serialized checkpoints for deterministic
coverage; their titles distinguish those tests from native UI duplication.

The measured SDK bundle SHA256 was
`7875a7fdca668f8fc887f7d2d6d8249fbac8a6f96fab3d5445266ee8ea0353e2`, and Replay was
`82533b4e318c81a5d3cd732dbfc77607d9ea315a28649cae182d72b6f60c56a7`.
These hashes identify the native UI and cost experiment builds, before the final post-grant
metadata-guard corrections covered by the retained tests.

## Event cost and ownership structure

The cost check dispatched 2,000 real rrweb click events per run through the full SDK with a
counting transport. It used matching ES2015/minified builds, two warmups, and seven alternating
runs of the implementation and baseline in Chromium. During measurement the observer used only
integer counters: event/write observation arrays did not grow, and there were no trace writes.
Network delivery was excluded.

| Measurement                     | Completed PR chain | Recording leases  |
| ------------------------------- | ------------------ | ----------------- |
| Median per 2,000 events         | 69.7 ms            | 73.6 ms           |
| Median per event                | 34.85 microseconds | 36.8 microseconds |
| Run range                       | 59.5–75.5 ms       | 63.5–82.6 ms      |
| Replay storage writes per event | 0                  | 0                 |

Raw baseline times in milliseconds: `59.7, 59.5, 74.0, 60.5, 75.5, 73.9, 69.7`.
Implementation times: `66.7, 66.6, 73.6, 63.5, 81.0, 78.6, 82.6`.
The approximately 5.6% median difference has overlapping ranges and is a controlled measurement,
not a production performance estimate. The baseline already reserved counters in memory; this
refactor does not claim a reduction from per-event writes. An ordinary lease writes one active
checkpoint and one final clean checkpoint, independently of event count.

The structural review counted declared fields and call sites, rather than every guard or runtime
instance:

| Ownership area       | Structure                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------ |
| Initialization       | One current owner; 12 fields, including optional acquisition/lease and queued-start token. |
| Acquisition          | Five fields, including cancellation and completion.                                        |
| Lease                | Six checkpoint fields; four closure controls: owner, released, local, anchor.              |
| Recorder             | One union with four phases; five fields on an active attempt.                              |
| Candidate            | Four fields; one discriminator for fresh, memory, or storage provenance.                   |
| Document             | Activation token and three-phase state; two fields per owner.                              |
| Shared rrweb runtime | Producer slot, execution depth, and pending cleanup.                                       |

Five cleanup-queue calls, one cleanup-await gate, and five rrweb execution wrappers coordinate
physical stop/start. One checkpoint finalizer seals counters. Five native lifecycle registrations
feed three document transition methods. The previous shared checkpoint pool, separate pointers,
pruning, TTL, storage-event claims, and recorder-status booleans were removed.

## Remaining limits

The dependency's partial-startup cleanup fix remains tracked in
[grafana/rrweb#59](https://github.com/grafana/rrweb/issues/59); the dependency was not upgraded here.
Faro's real rrweb tests cover guarded returned handles and deferred callbacks, not the unresolved
upstream rollback contract when rrweb fails without returning a usable cleanup handle.

Clean browser copies can still collide. No receiver conflict detection, original-tab election,
or targeted restart protocol is implied by Web Locks. Applications can still drop snapshot
events through Replay filtering and are responsible for the resulting unplayable history.

Persistent-session creation remains synchronously coordinated on a best-effort basis, separately
from recording ownership. See [the concurrency investigation](persistent-session-concurrency.md).
