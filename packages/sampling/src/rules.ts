// Adaptive sampling rules engine: the platform-neutral part of adaptive sampling. Pure
// functions and one small state machine; no Faro dependency, no I/O, no timers. The SDK
// adapter owns the clock (when D is), the buffers, persistence, and the mapping from Faro
// metas and items to the flat attribute and event shapes used here.
//
// The rules document is specified in the design doc's Rules schema tab and in grafana/faro
// under spec/sampling/rules.schema.json. The verdict is `meta.sampling` in the Faro payload.

import { fnv1a64Hex, keyU32, replayRollInput, triggerRollInput } from './key';

// ---------------------------------------------------------------------------------------
// Document shape
// ---------------------------------------------------------------------------------------

export const SCHEMA = 'faro.sampling.rules/v1';
export const SAMPLING_SCHEMA_VERSION = 1;

export type Action = 'keep_session' | 'keep_session_and_replay' | 'drop';

export interface Trigger {
  type: string;
  /** Field globs matched against the event's fields. Omitted means "any event of this type". */
  match?: Record<string, string>;
}

export interface Rule {
  /** Author-chosen, unique in the document, 1 to 64 chars of [A-Za-z0-9_-]. Appears as keptByRule. */
  id: string;
  /** Absent or null: a rule without a trigger (drop, or the base rate). */
  trigger?: Trigger | null;
  /** Attribute-path globs; omitted or empty matches every session. Not allowed on the base rate rule. */
  scope?: Record<string, string>;
  action: Action;
  /**
   * The base rate rule only (at most one per document, unscoped): probability of the base
   * sample, in [0, 1]. 0 means triggers only: nothing is base-sampled, but unlike drop the
   * triggers are still armed.
   */
  baseRate?: number;
  /** keep_session_and_replay rules without a trigger only: the share of base-sampled sessions that also record replay. Default 1. */
  replayRate?: number;
  /** Trigger rules only: when the trigger fires, the fraction of sessions actually kept by it. Default 1. */
  triggerRate?: number;
}

export interface RuleDocument {
  schema: string;
  rules: Rule[];
}

export type RuleKind = 'exclusion' | 'base_rate' | 'trigger';

export interface ParsedRule {
  rule: Rule;
  kind: RuleKind;
  /** Position in the document. Rules without a trigger are evaluated in this order at D. */
  index: number;
  /** A trigger rule naming a type this platform does not support. Never fires. */
  inert: boolean;
}

export interface ParsedDocument {
  rules: ParsedRule[];
  rulesHash: string;
  warnings: string[];
}

/** The v1 web trigger catalogue. Platforms pass their own set to parse(). */
export const WEB_TRIGGERS: ReadonlySet<string> = new Set([
  'error',
  'custom_event',
  'web_vital_threshold',
  'http_error',
  'console_error',
  'user_action',
  'page_view',
  'attribute',
]);

export class RuleDocumentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RuleDocumentError';
  }
}

/** Rule ids: author-chosen, stable across edits and reorders, label-safe. */
export const RULE_ID: RegExp = /^[A-Za-z0-9_-]{1,64}$/;

// ---------------------------------------------------------------------------------------
// Parse and validate
// ---------------------------------------------------------------------------------------

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isStringMap(v: unknown): v is Record<string, string> {
  return isRecord(v) && Object.keys(v).every((k) => typeof v[k] === 'string');
}

function isEmptyScope(scope: Record<string, string> | undefined): boolean {
  return !scope || Object.keys(scope).length === 0;
}

function isRate(v: unknown): v is number {
  return typeof v === 'number' && v >= 0 && v <= 1;
}

/**
 * Trigger types whose named match field is compared as a number (fires at or above) instead
 * of as a glob. The field must parse as a finite number; `parse()` rejects anything else,
 * because `Number('200ms')` is NaN and a NaN threshold would make the rule fire on every event.
 */
const NUMERIC_TRIGGERS: Record<string, string> = { web_vital_threshold: 'threshold' };

function isFiniteNumberString(v: string): boolean {
  return v.trim() !== '' && Number.isFinite(Number(v));
}

/**
 * Shape-validates a document and classifies each rule. Throws RuleDocumentError on a
 * malformed document (the SDK adapter turns that into a warning and falls back to keeping
 * everything, today's default). Unknown trigger types are not errors: the rule is kept,
 * marked inert, and reported in warnings, so a document written for a newer SDK degrades
 * loudly rather than failing.
 */
export function parse(input: unknown, supportedTriggers: ReadonlySet<string> = WEB_TRIGGERS): ParsedDocument {
  if (!isRecord(input)) {
    throw new RuleDocumentError('rule document must be an object');
  }
  if (input['schema'] !== SCHEMA) {
    throw new RuleDocumentError(`unsupported schema ${String(input['schema'])}; expected ${SCHEMA}`);
  }
  const rawRules = input['rules'];
  if (!Array.isArray(rawRules)) {
    throw new RuleDocumentError('rules must be an array');
  }

  const warnings: string[] = [];
  const ids = new Set<string>();
  const rules: ParsedRule[] = [];

  rawRules.forEach((raw: unknown, index: number) => {
    if (!isRecord(raw)) {
      throw new RuleDocumentError(`rule ${index} must be an object`);
    }
    const id = raw['id'];
    const where = `rule ${typeof id === 'string' ? JSON.stringify(id) : `#${index}`}`;

    if (typeof id !== 'string' || id.length === 0) {
      throw new RuleDocumentError(`rule #${index}: id is required`);
    }
    // The id is the author's stable handle for the rule. It ends up as keptByRule on every
    // kept session, so in Pinot columns and metric labels: keep it label-safe.
    if (!RULE_ID.test(id)) {
      throw new RuleDocumentError(`${where}: id must be 1 to 64 characters of A-Z, a-z, 0-9, _ or -`);
    }
    if (ids.has(id)) {
      throw new RuleDocumentError(`${where}: duplicate id`);
    }
    ids.add(id);

    const action = raw['action'];
    if (action !== 'keep_session' && action !== 'keep_session_and_replay' && action !== 'drop') {
      throw new RuleDocumentError(`${where}: action must be keep_session, keep_session_and_replay or drop`);
    }
    const scope = raw['scope'];
    if (scope !== undefined && !isStringMap(scope)) {
      throw new RuleDocumentError(`${where}: scope must be a map of string globs`);
    }
    if (raw['priority'] !== undefined) {
      throw new RuleDocumentError(
        `${where}: there is no priority field; rules without a trigger are evaluated in document order, first match decides`
      );
    }
    const baseRate = raw['baseRate'];
    const triggerRate = raw['triggerRate'];
    const replayRate = raw['replayRate'];
    const trigger = raw['trigger'];
    const hasTrigger = trigger !== null && trigger !== undefined;
    if (baseRate !== undefined && !isRate(baseRate)) {
      throw new RuleDocumentError(`${where}: baseRate must be a number in [0, 1]`);
    }
    if (triggerRate !== undefined && !isRate(triggerRate)) {
      throw new RuleDocumentError(`${where}: triggerRate must be a number in [0, 1]`);
    }
    if (replayRate !== undefined && !isRate(replayRate)) {
      throw new RuleDocumentError(`${where}: replayRate must be a number in [0, 1]`);
    }
    if (replayRate !== undefined && (action !== 'keep_session_and_replay' || hasTrigger)) {
      throw new RuleDocumentError(
        `${where}: replayRate is only allowed on a keep_session_and_replay rule without a trigger`
      );
    }

    let kind: RuleKind;
    let inert = false;
    if (!hasTrigger) {
      if (action === 'drop') {
        if (baseRate !== undefined) {
          throw new RuleDocumentError(`${where}: a drop rule cannot carry baseRate`);
        }
        kind = 'exclusion';
      } else {
        if (baseRate === undefined) {
          throw new RuleDocumentError(`${where}: a keep rule without a trigger must carry baseRate`);
        }
        kind = 'base_rate';
      }
      if (triggerRate !== undefined) {
        throw new RuleDocumentError(`${where}: triggerRate requires a trigger`);
      }
    } else {
      if (!isRecord(trigger) || typeof trigger['type'] !== 'string') {
        throw new RuleDocumentError(`${where}: trigger must have a string type`);
      }
      if (trigger['match'] !== undefined && !isStringMap(trigger['match'])) {
        throw new RuleDocumentError(`${where}: trigger.match must be a map of string globs`);
      }
      const numericField = NUMERIC_TRIGGERS[trigger['type']];
      if (numericField !== undefined && isStringMap(trigger['match'])) {
        const threshold = trigger['match'][numericField];
        if (threshold !== undefined && !isFiniteNumberString(threshold)) {
          throw new RuleDocumentError(
            `${where}: trigger.match.${numericField} must be a number, got ${JSON.stringify(threshold)}`
          );
        }
      }
      // A triggered drop would mean un-keeping a session that is already streaming and
      // already billable. Drops are decisions at D only.
      if (action === 'drop') {
        throw new RuleDocumentError(`${where}: drop rules cannot have a trigger`);
      }
      if (baseRate !== undefined) {
        throw new RuleDocumentError(`${where}: a trigger rule cannot carry baseRate`);
      }
      kind = 'trigger';
      if (!supportedTriggers.has(trigger['type'])) {
        inert = true;
        warnings.push(
          `${where}: trigger type ${JSON.stringify(trigger['type'])} is not supported on this platform; rule is inert`
        );
      }
    }

    rules.push({ rule: raw as unknown as Rule, kind, index, inert });
  });

  // One base rate per document, and it applies to every session. Scoped base rates were
  // removed from the design: a view that mixed scopes mixed sampling rates, and every
  // count and rate read off the base sample would have been skewed by it.
  const baseRules = rules.filter((r) => r.kind === 'base_rate');
  if (baseRules.length > 1) {
    const names = baseRules.map((r) => JSON.stringify(r.rule.id)).join(', ');
    throw new RuleDocumentError(`a document has at most one base rate rule; found ${baseRules.length}: ${names}`);
  }
  const baseRule = baseRules[0];
  if (baseRule && !isEmptyScope(baseRule.rule.scope)) {
    throw new RuleDocumentError(
      `rule ${JSON.stringify(baseRule.rule.id)}: the base rate rule cannot have a scope; use drop rules to exclude sessions`
    );
  }

  // Authoring-time lint: a rule without a trigger that matches every session (no scope)
  // decides for everyone, so any rule without a trigger after it can never be reached. With
  // the base rate rule always unscoped, this fires when a drop rule is placed below it.
  const withoutTrigger = rules.filter((r) => r.kind !== 'trigger');
  const catchAll = withoutTrigger.findIndex((r) => isEmptyScope(r.rule.scope));
  if (catchAll !== -1 && catchAll < withoutTrigger.length - 1) {
    const shadowed = withoutTrigger
      .slice(catchAll + 1)
      .map((r) => JSON.stringify(r.rule.id))
      .join(', ');
    warnings.push(
      `rule ${JSON.stringify(withoutTrigger[catchAll]!.rule.id)} matches every session, so later rules without a trigger are unreachable: ${shadowed}`
    );
  }

  return { rules, rulesHash: fnv1a64Hex(canonicalize(normalizeDocument(input))), warnings };
}

/**
 * The two spellings of "no trigger" (absent, null) and of "every session" (absent scope,
 * empty scope) mean the same thing, so they must produce the same rulesHash. Strip the
 * explicit forms before canonicalising. Only these two fields; nothing else is rewritten.
 */
export function normalizeDocument(input: Record<string, unknown>): Record<string, unknown> {
  const rawRules = input['rules'];
  const rules = (Array.isArray(rawRules) ? rawRules : []).map((r: unknown) => {
    if (!isRecord(r)) {
      return r;
    }
    const out: Record<string, unknown> = { ...r };
    if (out['trigger'] === null) {
      delete out['trigger'];
    }
    const scope = out['scope'];
    if (isRecord(scope) && Object.keys(scope).length === 0) {
      delete out['scope'];
    }
    return out;
  });
  return { ...input, rules };
}

/**
 * Canonical JSON per RFC 8785 (JCS): object keys sorted by UTF-16 code units, no
 * whitespace, ES6 number formatting, strings escaped the way JSON.stringify does (only
 * `"`, `\` and U+0000..U+001F; no HTML escaping, non-ASCII literal). JSON.stringify and
 * Array.prototype.sort give exactly that in JavaScript, as long as the object is written
 * key by key from the sorted list (a rebuilt object would put integer-like keys in numeric
 * order). The input to rulesHash, after normalizeDocument(). Vectors: __vectors__/rules-hash.json.
 */
export function canonicalize(value: unknown): string {
  if (Array.isArray(value)) {
    return '[' + value.map(canonicalize).join(',') + ']';
  }
  if (isRecord(value)) {
    const keys = Object.keys(value)
      .filter((k) => value[k] !== undefined)
      .sort();
    return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonicalize(value[k])).join(',') + '}';
  }
  return JSON.stringify(value);
}

// ---------------------------------------------------------------------------------------
// Matching
// ---------------------------------------------------------------------------------------

/** Glob with `*` as the only metacharacter, matched against the whole string. */
export function globMatch(pattern: string, value: string): boolean {
  if (pattern === '*') {
    return true;
  }
  if (!pattern.includes('*')) {
    return pattern === value;
  }
  const parts = pattern.split('*');
  let pos = 0;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]!;
    if (part === '') {
      continue;
    }
    const idx = value.indexOf(part, pos);
    if (idx === -1) {
      return false;
    }
    if (i === 0 && idx !== 0) {
      return false;
    }
    pos = idx + part.length;
  }
  const last = parts[parts.length - 1]!;
  return last === '' || value.endsWith(last);
}

/**
 * Session attributes as a flat map of dotted paths, e.g. "session.attributes.FI",
 * "browser.userAgent", "app.version". The SDK adapter flattens Faro metas into this.
 */
export type Attributes = Record<string, string>;

export function matchScope(scope: Record<string, string> | undefined, attributes: Attributes): boolean {
  if (!scope) {
    return true;
  }
  for (const path of Object.keys(scope)) {
    const v = attributes[path];
    if (v === undefined || !globMatch(scope[path]!, v)) {
      return false;
    }
  }
  return true;
}

/** An observed event, already normalised by the SDK adapter to a type plus string fields. */
export interface SessionEvent {
  type: string;
  fields: Record<string, string>;
}

export function matchTrigger(trigger: Trigger, event: SessionEvent): boolean {
  if (trigger.type !== event.type) {
    return false;
  }
  if (!trigger.match) {
    return true;
  }
  for (const field of Object.keys(trigger.match)) {
    const pattern = trigger.match[field]!;
    if (NUMERIC_TRIGGERS[trigger.type] === field) {
      // web_vital_threshold: { metric: "INP", threshold: "200" } fires when value >= threshold.
      // parse() has already rejected a non-numeric threshold; the guard here is for a Trigger
      // built by hand, so a NaN on either side never fires instead of always firing.
      const value = Number(event.fields['value']);
      const threshold = Number(pattern);
      if (!Number.isFinite(value) || !Number.isFinite(threshold) || value < threshold) {
        return false;
      }
      continue;
    }
    const v = event.fields[field];
    if (v === undefined || !globMatch(pattern, v)) {
      return false;
    }
  }
  return true;
}

// ---------------------------------------------------------------------------------------
// Decision at D
// ---------------------------------------------------------------------------------------

export type KeptBy = 'sample' | 'trigger' | 'both' | null;

/** The verdict. Travels as the `sampling` section of the Faro meta, once per batch body; the adapter stamps buffered items at flush. */
export interface Verdict {
  schema: number;
  /** The session id as it was at D. Identity for counting and grouping; keyU32 is a check value and collides at scale. */
  sessionId: string;
  inBaseSample: boolean;
  keptBy: KeptBy;
  keptByRule: string | null;
  baseRate: number;
  /** The base rule's replayRate when a keep_session_and_replay base rule applied, else null. Lets the collector check the replay roll. */
  replayRate: number | null;
  triggerRate: number | null;
  replayKept: boolean;
  rulesHash: string;
  keyU32: number;
}

export interface Decision {
  /** True when an exclusion rule won: nothing is ever sent, nothing is armed. */
  dropped: boolean;
  dropRuleId: string | null;
  baseRuleId: string | null;
  /** Trigger rules whose scope matched at D. Frozen for the rest of the session. */
  armed: ParsedRule[];
  verdict: Verdict;
}

/**
 * The one evaluation per session. Called at D with the attributes as they are at that
 * moment; scope is never re-matched afterwards.
 *
 * Precedence: rules without a trigger (drops and the base rate) are evaluated in document
 * order and the first one whose scope matches decides the session's fate at D: dropped, or
 * the base rate. A drop is final; nothing is armed for a dropped session. The base rate
 * rule has no scope, so it is the catch-all for every session no drop rule excluded. If
 * there is none, the rate is 1.0 (today's default behaviour) with no rule id. Trigger rules
 * are unordered: every matching, non-inert one is armed.
 */
export function decide(doc: ParsedDocument, attributes: Attributes, sessionId: string): Decision {
  const matching = doc.rules.filter((r) => matchScope(r.rule.scope, attributes));
  const first = matching.find((r) => r.kind !== 'trigger');
  const triggers = matching.filter((r) => r.kind === 'trigger' && !r.inert);

  const k = keyU32(sessionId);
  const base: Verdict = {
    schema: SAMPLING_SCHEMA_VERSION,
    sessionId,
    inBaseSample: false,
    keptBy: null,
    keptByRule: null,
    baseRate: 1,
    replayRate: null,
    triggerRate: null,
    replayKept: false,
    rulesHash: doc.rulesHash,
    keyU32: k,
  };

  if (first && first.kind === 'exclusion') {
    // Nothing is ever sent for a dropped session, so this verdict never leaves the
    // client; it is returned for the adapter's own bookkeeping.
    return { dropped: true, dropRuleId: first.rule.id, baseRuleId: null, armed: [], verdict: base };
  }

  const baseRuleId = first ? first.rule.id : null;
  const baseRate = first ? first.rule.baseRate! : 1;

  const inBase = k / 4294967296 < baseRate;
  // Replay is a separate outcome. A base-sampled session records replay when its rule is
  // keep_session_and_replay, thinned by replayRate on a roll keyed apart from the base one
  // so the two are independent and the collector can recompute both.
  let replayKept = false;
  let replayRate: number | null = null;
  if (first && first.rule.action === 'keep_session_and_replay') {
    replayRate = first.rule.replayRate ?? 1;
    if (inBase) {
      replayKept = keyU32(replayRollInput(sessionId)) / 4294967296 < replayRate;
    }
  }
  return {
    dropped: false,
    dropRuleId: null,
    baseRuleId,
    armed: triggers,
    verdict: {
      ...base,
      inBaseSample: inBase,
      keptBy: inBase ? 'sample' : null,
      baseRate,
      replayRate,
      replayKept,
    },
  };
}

// ---------------------------------------------------------------------------------------
// Per-session state: pending before D, armed after
// ---------------------------------------------------------------------------------------

export interface Fired {
  ruleId: string;
  action: Action;
  triggerRate: number | null;
}

/**
 * A session's state as plain JSON, for the adapter to persist with the Faro session so a
 * reload or a restored tab continues with the same decision and never re-rolls.
 */
export interface SerializedSession {
  /** Format version of this object, not of the rules document or the verdict. */
  v: 1;
  sessionId: string;
  /** Null before D. */
  decision: {
    dropped: boolean;
    dropRuleId: string | null;
    baseRuleId: string | null;
    armedRuleIds: string[];
    verdict: Verdict;
  } | null;
  /** Rules that have fired, or missed their triggerRate roll, since D. */
  firedRuleIds: string[];
  /** Events seen before D, still waiting for the decision. */
  pending: SessionEvent[];
}

export interface Session {
  readonly sessionId: string;
  /** Null until decide() has run. */
  readonly decision: Decision | null;
  readonly verdict: Verdict | null;
  /** Events seen before D. Resolved at D against the armed set. */
  readonly pending: readonly SessionEvent[];
  /**
   * Record an event. Before D it is queued. After D it is matched against the armed
   * triggers; returns the rules that fired (after their triggerRate roll) and whether
   * the verdict changed, so the adapter knows to flush.
   */
  observe(event: SessionEvent): { fired: Fired[]; changed: boolean };
  /** Run the decision with the attributes as they are now, then resolve pending events. */
  decide(attributes: Attributes): { decision: Decision; fired: Fired[] };
  /** The session's state as plain JSON. restoreSession() takes it back. */
  serialize(): SerializedSession;
}

export function createSession(doc: ParsedDocument, sessionId: string): Session {
  return buildSession(doc, sessionId, null, [], []);
}

/**
 * Rebuild a session from serialize() output. Returns null when the state was produced by a
 * different rules document (the rulesHash differs) or is not in a shape this version
 * understands; the adapter then starts a fresh session, which re-rolls under the new rules.
 */
export function restoreSession(doc: ParsedDocument, state: unknown): Session | null {
  if (!isRecord(state) || state['v'] !== 1 || typeof state['sessionId'] !== 'string') {
    return null;
  }
  const sessionId = state['sessionId'];
  const pending = Array.isArray(state['pending']) ? (state['pending'] as SessionEvent[]) : [];
  const firedRuleIds = Array.isArray(state['firedRuleIds']) ? (state['firedRuleIds'] as string[]) : [];
  const raw = state['decision'];
  if (raw === null || raw === undefined) {
    return buildSession(doc, sessionId, null, firedRuleIds, pending);
  }
  if (!isRecord(raw) || !isRecord(raw['verdict']) || !Array.isArray(raw['armedRuleIds'])) {
    return null;
  }
  const verdict = raw['verdict'] as unknown as Verdict;
  if (verdict.rulesHash !== doc.rulesHash || verdict.sessionId !== sessionId) {
    return null;
  }
  const byId = new Map(doc.rules.map((r) => [r.rule.id, r]));
  const armed: ParsedRule[] = [];
  for (const id of raw['armedRuleIds'] as unknown[]) {
    const r = typeof id === 'string' ? byId.get(id) : undefined;
    if (r && r.kind === 'trigger') {
      armed.push(r);
    }
  }
  const decision: Decision = {
    dropped: raw['dropped'] === true,
    dropRuleId: typeof raw['dropRuleId'] === 'string' ? raw['dropRuleId'] : null,
    baseRuleId: typeof raw['baseRuleId'] === 'string' ? raw['baseRuleId'] : null,
    armed,
    verdict: { ...verdict },
  };
  return buildSession(doc, sessionId, decision, firedRuleIds, pending);
}

function buildSession(
  doc: ParsedDocument,
  sessionId: string,
  initialDecision: Decision | null,
  initialFired: string[],
  initialPending: SessionEvent[]
): Session {
  let decision: Decision | null = initialDecision;
  let verdict: Verdict | null = initialDecision ? initialDecision.verdict : null;
  const pending: SessionEvent[] = [...initialPending];
  const firedIds = new Set<string>(initialFired);

  function applyFired(fired: Fired[]): boolean {
    if (!verdict || decision?.dropped || fired.length === 0) {
      return false;
    }
    const before = JSON.stringify(verdict);
    for (const f of fired) {
      // Keep actions are monotonic and union; the first firing rule names keptByRule.
      if (verdict.keptBy === 'sample') {
        verdict.keptBy = 'both';
      } else if (verdict.keptBy === null) {
        verdict.keptBy = 'trigger';
      }
      if (verdict.keptByRule === null) {
        verdict.keptByRule = f.ruleId;
        verdict.triggerRate = f.triggerRate;
      }
      if (f.action === 'keep_session_and_replay') {
        verdict.replayKept = true;
      }
    }
    return JSON.stringify(verdict) !== before;
  }

  function evaluate(event: SessionEvent): Fired[] {
    if (!decision || decision.dropped) {
      return [];
    }
    const fired: Fired[] = [];
    for (const armed of decision.armed) {
      if (firedIds.has(armed.rule.id)) {
        continue;
      }
      if (!matchTrigger(armed.rule.trigger!, event)) {
        continue;
      }
      const rate = armed.rule.triggerRate;
      if (rate !== undefined && !(keyU32(triggerRollInput(sessionId, armed.rule.id)) / 4294967296 < rate)) {
        // Deterministic per (session, rule): a rule that misses its triggerRate roll
        // misses it for the whole session, so repeated events do not re-roll.
        firedIds.add(armed.rule.id);
        continue;
      }
      firedIds.add(armed.rule.id);
      fired.push({ ruleId: armed.rule.id, action: armed.rule.action, triggerRate: rate ?? null });
    }
    return fired;
  }

  return {
    sessionId,
    get decision() {
      return decision;
    },
    get verdict() {
      return verdict;
    },
    get pending() {
      return pending;
    },
    observe(event) {
      if (!decision) {
        pending.push(event);
        return { fired: [], changed: false };
      }
      const fired = evaluate(event);
      return { fired, changed: applyFired(fired) };
    },
    decide(attributes) {
      if (decision) {
        throw new Error('decide() may only run once per session');
      }
      decision = decide(doc, attributes, sessionId);
      verdict = decision.verdict;
      const fired: Fired[] = [];
      for (const ev of pending) {
        fired.push(...evaluate(ev));
      }
      pending.length = 0;
      applyFired(fired);
      return { decision, fired };
    },
    serialize() {
      return {
        v: 1,
        sessionId,
        decision: decision
          ? {
              dropped: decision.dropped,
              dropRuleId: decision.dropRuleId,
              baseRuleId: decision.baseRuleId,
              armedRuleIds: decision.armed.map((r) => r.rule.id),
              verdict: { ...decision.verdict },
            }
          : null,
        firedRuleIds: Array.from(firedIds),
        pending: pending.map((e) => ({ type: e.type, fields: { ...e.fields } })),
      };
    },
  };
}
