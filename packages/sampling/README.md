# @grafana/faro-sampling

_Warning_: pre-release. Part of adaptive sampling for Faro, which is not released yet.

The adaptive sampling rules engine: the platform-neutral part of adaptive sampling. It parses and validates a
`faro.sampling.rules/v1` document, computes `rulesHash`, matches scopes and triggers, decides once per session at the
decision point, arms triggers, and produces the sampling verdict that travels as `meta.sampling`. No Faro dependency,
no I/O, no timers. The SDK adapter owns the clock, the buffers, persistence and the mapping from Faro metas and items to
the flat shapes used here.

The rules document and the verdict are specified in `grafana/faro` under `spec/sampling/`. The vectors published there
are mirrored in `src/__vectors__/` and every test run checks the key, the three rolls and `rulesHash` against them bit
for bit.

## Usage

```ts
import { createSession, parse, restoreSession, WEB_TRIGGERS } from '@grafana/faro-sampling';

const doc = parse(rulesDocument, WEB_TRIGGERS); // throws RuleDocumentError if malformed; doc.warnings for soft issues
const session = createSession(doc, sessionId);

session.observe({ type: 'error', fields: { value: '...' } }); // before D: queued

const { decision, fired } = session.decide(attributes); // at D, once
// decision.dropped, decision.armed, decision.verdict

session.observe({ type: 'custom_event', fields: { name: 'checkout_failed' } });
// after D: matched against the armed set; returns { fired, changed }

session.verdict; // sessionId, inBaseSample, keptBy, keptByRule, baseRate, replayRate,
// triggerRate, replayKept, rulesHash, keyU32

const state = session.serialize(); // plain JSON, persist it with the session
const restored = restoreSession(doc, state); // null if the rules changed since; start a fresh session then
```

`Attributes` is a flat map of dotted paths (`session.attributes.FI`, `browser.userAgent`, `app.version`).
`SessionEvent.fields` is a flat map of strings; `web_vital_threshold` compares `fields.value` numerically against
`match.threshold`.

## Command line

```sh
npx faro-sampling validate rules.json   # parse, print warnings, exit 1 on an error
npx faro-sampling hash rules.json       # the rulesHash the SDK stamps on verdicts
```

## Semantics pinned by the tests

- Key: FNV-1a 32 over UTF-8, fmix32 finalizer. A roll passes when `keyU32 / 2^32 < rate`. The base roll hashes the
  session id, the replay roll `sessionId + "\0replay\0"`, the trigger roll `sessionId + "\0trigger\0" + ruleId`. Three
  domains, so no rule id can collide with the replay roll.
- `rulesHash`: FNV-1a 64 over the RFC 8785 canonical JSON of the document after stripping explicit `trigger: null` and
  `scope: {}`. Key order in the source does not change it. An audit identifier, never a key input.
- Rule `id`: author-chosen, unique, `[A-Za-z0-9_-]{1,64}`. It becomes `keptByRule`, so it has to be label-safe. There
  is no `priority` field; one in the input is a parse error.
- Three rule kinds by shape: exclusion (no `trigger`, `drop`), base rate (no `trigger`, keep action, `baseRate`),
  trigger. One base rate rule per document, and it cannot have a scope. Exclusions and triggers keep their scopes. No
  base rate rule means `baseRate: 1`, keep everything.
- Rules without a trigger are evaluated in document order at D and the first whose scope matches decides, a drop or the
  base rate. A drop is final: nothing is armed. Trigger rules are unordered; every matching one is armed, and keep
  actions union. A scope-less rule without a trigger placed above other rules without a trigger makes them unreachable
  and produces a warning.
- Unknown trigger types are inert with a warning, not errors. A `web_vital_threshold` whose `match.threshold` is not a
  finite number is a parse error: `Number('200ms')` is NaN, and a NaN threshold would fire on every event.
- Scope is matched once, at D, and never again. Events before D are queued and resolved at D against the armed set.
- Each armed rule fires at most once per session; a `triggerRate` miss is remembered so repeated events do not re-roll.
- `keptBy` moves `null -> trigger`, `sample -> both`; the first firing rule names `keptByRule` and `triggerRate`;
  `replayKept` becomes true on any `keep_session_and_replay`.
- Rates are in [0, 1]. `baseRate: 0` means triggers only; `triggerRate: 0` never fires; `replayRate: 0` records no
  replay from the base rate.
- `serialize()` / `restoreSession()`: a restored session keeps its verdict, armed set, fired rules and pending events.
  State from a different rules document (`rulesHash` differs) restores as `null`.

## Not here

Buffers, flush ordering, the decision deadline and `pagehide`, the DOM-size guard, the verdict wire format, collector
validation. Those belong to the SDK adapter and the collector.
