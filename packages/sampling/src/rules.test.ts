import rulesHashVectors from './__vectors__/rules-hash.json';
import { keyFraction, keyU32, triggerKeyFraction } from './key';
import {
  type Attributes,
  canonicalize,
  createSession,
  decide,
  globMatch,
  matchScope,
  matchTrigger,
  normalizeDocument,
  parse,
  restoreSession,
  RuleDocumentError,
  SCHEMA,
} from './rules';

// The design doc's example: one exclusion, one base rate, three triggers (one of them
// scoped, one with a triggerRate).
const DOC = {
  schema: SCHEMA,
  rules: [
    { id: 'no-bots', scope: { 'browser.userAgent': '*HeadlessChrome*' }, action: 'drop' },
    { id: 'default-base', action: 'keep_session', baseRate: 0.05 },
    { id: 'errors', trigger: { type: 'error' }, scope: {}, action: 'keep_session_and_replay' },
    {
      id: 'vip-checkout',
      trigger: { type: 'page_view', match: { view: '/checkout/*' } },
      scope: { 'session.attributes.FI': 'acme' },
      action: 'keep_session',
    },
    {
      id: 'checkout-failed',
      trigger: { type: 'custom_event', match: { name: 'checkout_failed' } },
      scope: {},
      action: 'keep_session_and_replay',
      triggerRate: 0.5,
    },
  ],
};

const chrome: Attributes = { 'browser.userAgent': 'Mozilla/5.0 Chrome/128', 'browser.name': 'Chrome' };
const acme: Attributes = { ...chrome, 'session.attributes.FI': 'acme' };
const other: Attributes = { ...chrome, 'session.attributes.FI': 'other' };
const bot: Attributes = { ...chrome, 'browser.userAgent': 'Mozilla/5.0 HeadlessChrome/128' };

/** First session id (from a fixed sequence) whose key satisfies the predicate. */
function sidWhere(pred: (k: number) => boolean): string {
  for (let i = 0; i < 100_000; i++) {
    const s = `t${i}`;
    if (pred(keyFraction(s))) {
      return s;
    }
  }
  throw new Error('no id found');
}
const SID_IN_5 = sidWhere((k) => k < 0.05); // in the base sample at 0.05
const SID_OUT = sidWhere((k) => k >= 0.5); // out at 0.05

const doc = (rules: unknown[]) => ({ schema: SCHEMA, rules });
const rejects = (rules: unknown[], re: RegExp) => expect(() => parse(doc(rules))).toThrow(re);

describe('parse', () => {
  it('classifies rules and hashes the document', () => {
    const parsed = parse(DOC);
    expect(parsed.rules.map((r) => r.kind)).toEqual(['exclusion', 'base_rate', 'trigger', 'trigger', 'trigger']);
    expect(parsed.warnings).toEqual([]);
    expect(parsed.rulesHash).toMatch(/^[0-9a-f]{16}$/);
  });

  it('rulesHash ignores key order and whitespace but not content', () => {
    const a = parse(DOC).rulesHash;
    const reordered = JSON.parse(JSON.stringify(DOC));
    reordered.rules = reordered.rules.map((r: Record<string, unknown>) =>
      Object.fromEntries(Object.entries(r).reverse())
    );
    expect(parse(reordered).rulesHash).toBe(a);
    const changed = JSON.parse(JSON.stringify(DOC));
    changed.rules[1].baseRate = 0.1;
    expect(parse(changed).rulesHash).not.toBe(a);
    expect(canonicalize({ b: 1, a: [true, null, 'x'] })).toBe('{"a":[true,null,"x"],"b":1}');
  });

  it('reproduces the canonical form and rulesHash of every document in spec/sampling/rules-hash.json', () => {
    for (const v of rulesHashVectors) {
      expect(canonicalize(normalizeDocument(v.document as Record<string, unknown>))).toBe(v.canonical);
      expect(parse(v.document).rulesHash).toBe(v.rulesHash);
    }
  });

  it('canonicalize follows RFC 8785 where JSON serializers usually disagree', () => {
    // No HTML escaping, non-ASCII literal, control characters as \u00xx lowercase.
    expect(canonicalize({ v: '<a&b> "q" \\ \u0001 ünï' })).toBe('{"v":"<a&b> \\"q\\" \\\\ \\u0001 ünï"}');
    // ES6 number formatting: no exponent down to 1e-6, exponent without zero padding below.
    expect(canonicalize({ r: [0, 1, 0.5, 0.000001, 1e-7, 0.1] })).toBe('{"r":[0,1,0.5,0.000001,1e-7,0.1]}');
    // Keys sort by UTF-16 code units: U+1F600 (surrogates D83D DE00) sorts before U+FF01.
    expect(canonicalize({ '！': 1, '\u{1f600}': 2, a: 3 })).toBe('{"a":3,"\u{1f600}":2,"！":1}');
    // Integer-like keys sort as strings. A JS object would put them in numeric order.
    expect(canonicalize({ '10': 1, '2': 2, '1': 3, b: 4 })).toBe('{"1":3,"10":1,"2":2,"b":4}');
  });

  it('unknown trigger types are inert with a warning, not errors', () => {
    const parsed = parse({
      ...DOC,
      rules: [
        ...DOC.rules,
        { id: 'journey', trigger: { type: 'journey', match: { id: 'transfer' } }, action: 'keep_session' },
      ],
    });
    const j = parsed.rules.find((r) => r.rule.id === 'journey')!;
    expect(j.inert).toBe(true);
    expect(parsed.warnings).toHaveLength(1);
    expect(parsed.warnings[0]).toMatch(/journey.*inert/);
  });

  it('rejects malformed documents', () => {
    expect(() => parse({ schema: 'faro.sampling.rules/v2', rules: [] })).toThrow(RuleDocumentError);
    rejects([{ id: 'has space', action: 'keep_session', baseRate: 0.1 }], /1 to 64 characters/);
    rejects([{ id: 'x'.repeat(65), action: 'keep_session', baseRate: 0.1 }], /1 to 64 characters/);
    rejects([{ id: 'dots.not.ok', action: 'keep_session', baseRate: 0.1 }], /1 to 64 characters/);
    rejects([{ id: 'a', trigger: null, action: 'keep_session' }], /must carry baseRate/);
    rejects([{ id: 'a', trigger: null, action: 'drop', baseRate: 0.1 }], /cannot carry baseRate/);
    rejects([{ id: 'a', trigger: { type: 'error' }, action: 'drop' }], /drop rules cannot have a trigger/);
    rejects(
      [{ id: 'a', trigger: { type: 'error' }, action: 'keep_session', baseRate: 0.1 }],
      /trigger rule cannot carry baseRate/
    );
    rejects([{ id: 'a', trigger: null, action: 'keep_session', baseRate: -0.1 }], /baseRate must be/);
    rejects([{ id: 'a', trigger: null, action: 'keep_session', baseRate: 1.5 }], /baseRate must be/);
    rejects(
      [{ id: 'a', trigger: null, action: 'keep_session', baseRate: 0.1, triggerRate: 0.5 }],
      /triggerRate requires a trigger/
    );
    rejects(
      [
        { id: 'a', trigger: null, action: 'keep_session', baseRate: 0.1 },
        { id: 'a', trigger: null, action: 'drop' },
      ],
      /duplicate id/
    );
    rejects([{ trigger: null, action: 'drop' }], /id is required/);
    rejects([{ id: 'a', trigger: null, action: 'explode' }], /action must be/);
    rejects([{ id: 'a', action: 'keep_session_and_replay', baseRate: 0.1, replayRate: 1.5 }], /replayRate must be/);
    rejects([{ id: 'a', action: 'keep_session', baseRate: 0.1, replayRate: 0.5 }], /replayRate is only allowed/);
    rejects(
      [{ id: 'a', trigger: { type: 'error' }, action: 'keep_session_and_replay', replayRate: 0.5 }],
      /replayRate is only allowed/
    );
    rejects([{ id: 'x', priority: 10, action: 'keep_session', baseRate: 0.1 }], /no priority field/);
  });

  it('allows one base rate rule per document, and it cannot be scoped', () => {
    rejects(
      [
        { id: 'vip-base', scope: { 'session.attributes.FI': 'acme' }, action: 'keep_session', baseRate: 0.5 },
        { id: 'default-base', action: 'keep_session', baseRate: 0.05 },
      ],
      /at most one base rate rule; found 2: "vip-base", "default-base"/
    );
    rejects(
      [
        { id: 'b1', action: 'keep_session', baseRate: 0.1 },
        { id: 'b2', action: 'keep_session', baseRate: 0.1 },
      ],
      /at most one base rate rule/
    );
    rejects(
      [{ id: 'acme-base', scope: { 'session.attributes.FI': 'acme' }, action: 'keep_session', baseRate: 0.5 }],
      /"acme-base": the base rate rule cannot have a scope/
    );
    // An empty scope is the same as no scope.
    expect(() => parse(doc([{ id: 'base', scope: {}, action: 'keep_session', baseRate: 0.5 }]))).not.toThrow();
    // Drop rules and trigger rules keep their scopes.
    expect(() =>
      parse(
        doc([
          { id: 'no-internal', scope: { 'session.attributes.FI': 'internal' }, action: 'drop' },
          { id: 'base', action: 'keep_session', baseRate: 0.05 },
          {
            id: 'vip-errors',
            trigger: { type: 'error' },
            scope: { 'session.attributes.FI': 'acme' },
            action: 'keep_session_and_replay',
          },
        ])
      )
    ).not.toThrow();
  });

  it('lint: a scope-less rule without a trigger makes later rules without a trigger unreachable, and says so', () => {
    const parsed = parse(
      doc([
        { id: 'default-base', action: 'keep_session', baseRate: 0.05 },
        { id: 'no-bots', scope: { 'browser.userAgent': '*HeadlessChrome*' }, action: 'drop' },
        { id: 'errors', trigger: { type: 'error' }, action: 'keep_session_and_replay' },
      ])
    );
    expect(parsed.warnings).toHaveLength(1);
    expect(parsed.warnings[0]).toMatch(/"default-base" matches every session.*"no-bots"/);
    expect(decide(parsed, bot, SID_OUT).dropped).toBe(false); // and it really is shadowed
  });

  it('rulesHash is the same for the explicit and shorthand spellings of no trigger / every session', () => {
    const explicit = parse(
      doc([
        { id: 'base', trigger: null, scope: {}, action: 'keep_session', baseRate: 0.05 },
        { id: 'errors', trigger: { type: 'error' }, scope: {}, action: 'keep_session_and_replay' },
      ])
    );
    const shorthand = parse(
      doc([
        { id: 'base', action: 'keep_session', baseRate: 0.05 },
        { id: 'errors', trigger: { type: 'error' }, action: 'keep_session_and_replay' },
      ])
    );
    expect(explicit.rulesHash).toBe(shorthand.rulesHash);
    // and a real scope still changes it
    const scoped = parse(
      doc([
        { id: 'base', action: 'keep_session', baseRate: 0.05 },
        { id: 'errors', trigger: { type: 'error' }, scope: { 'app.name': 'x' }, action: 'keep_session_and_replay' },
      ])
    );
    expect(scoped.rulesHash).not.toBe(shorthand.rulesHash);
  });
});

describe('matching', () => {
  it('globMatch: * is the only metacharacter and matches the whole string', () => {
    expect(globMatch('*', '')).toBe(true);
    expect(globMatch('*HeadlessChrome*', 'Mozilla HeadlessChrome/1')).toBe(true);
    expect(globMatch('/checkout/*', '/checkout/cart')).toBe(true);
    expect(globMatch('/checkout/*', '/x/checkout/cart')).toBe(false);
    expect(globMatch('*payment*', 'the payment failed')).toBe(true);
    expect(globMatch('a*b*c', 'aXXbYYc')).toBe(true);
    expect(globMatch('a*b*c', 'aXXbYY')).toBe(false);
    expect(globMatch('exact', 'exact')).toBe(true);
    expect(globMatch('exact', 'exactly')).toBe(false);
  });

  it('matchScope: empty scope matches everything; missing attribute fails', () => {
    expect(matchScope(undefined, {})).toBe(true);
    expect(matchScope({}, {})).toBe(true);
    expect(matchScope({ 'session.attributes.FI': 'acme' }, acme)).toBe(true);
    expect(matchScope({ 'session.attributes.FI': 'acme' }, other)).toBe(false);
    expect(matchScope({ 'session.attributes.FI': 'acme' }, chrome)).toBe(false);
  });

  it('matchTrigger: type, field globs, numeric threshold', () => {
    expect(matchTrigger({ type: 'error' }, { type: 'error', fields: { value: 'x' } })).toBe(true);
    expect(matchTrigger({ type: 'error' }, { type: 'custom_event', fields: {} })).toBe(false);
    expect(
      matchTrigger(
        { type: 'error', match: { value: '*payment*' } },
        { type: 'error', fields: { value: 'payment declined' } }
      )
    ).toBe(true);
    expect(
      matchTrigger({ type: 'error', match: { value: '*payment*' } }, { type: 'error', fields: { value: 'oops' } })
    ).toBe(false);
    const inp = { type: 'web_vital_threshold', match: { metric: 'INP', threshold: '200' } };
    expect(matchTrigger(inp, { type: 'web_vital_threshold', fields: { metric: 'INP', value: '350' } })).toBe(true);
    expect(matchTrigger(inp, { type: 'web_vital_threshold', fields: { metric: 'INP', value: '120' } })).toBe(false);
    expect(matchTrigger(inp, { type: 'web_vital_threshold', fields: { metric: 'LCP', value: '9000' } })).toBe(false);
  });
});

describe('decide', () => {
  it('session A: acme, in base sample, armed set includes the scoped vip-checkout trigger; page_view upgrades to both', () => {
    const s = createSession(parse(DOC), SID_IN_5);
    const { decision } = s.decide(acme);
    expect(decision.dropped).toBe(false);
    expect(decision.baseRuleId).toBe('default-base'); // the one base rate applies to every tenant
    expect(decision.verdict.baseRate).toBe(0.05);
    expect(decision.verdict.inBaseSample).toBe(true);
    expect(decision.verdict.keptBy).toBe('sample');
    expect(decision.armed.map((r) => r.rule.id)).toEqual(['errors', 'vip-checkout', 'checkout-failed']);

    const r = s.observe({ type: 'page_view', fields: { view: '/checkout/cart' } });
    expect(r.fired.map((f) => f.ruleId)).toEqual(['vip-checkout']);
    expect(r.changed).toBe(true);
    expect(s.verdict!.keptBy).toBe('both');
    expect(s.verdict!.keptByRule).toBe('vip-checkout');
    expect(s.verdict!.replayKept).toBe(false); // keep_session does not keep replay
  });

  it('session B: other tenant, out of base sample, vip-checkout not armed; error keeps with replay', () => {
    const s = createSession(parse(DOC), SID_OUT);
    const { decision } = s.decide(other);
    expect(decision.baseRuleId).toBe('default-base');
    expect(decision.verdict.baseRate).toBe(0.05);
    expect(decision.verdict.inBaseSample).toBe(false);
    expect(decision.verdict.keptBy).toBeNull(); // pending: nothing sent yet
    expect(decision.armed.map((r) => r.rule.id)).toEqual(['errors', 'checkout-failed']);

    expect(s.observe({ type: 'page_view', fields: { view: '/checkout/cart' } }).changed).toBe(false); // scope failed at D
    const r = s.observe({ type: 'error', fields: { value: 'TypeError: rates is undefined' } });
    expect(r.fired.map((f) => f.ruleId)).toEqual(['errors']);
    expect(s.verdict!.keptBy).toBe('trigger');
    expect(s.verdict!.keptByRule).toBe('errors');
    expect(s.verdict!.replayKept).toBe(true);
    expect(s.verdict!.inBaseSample).toBe(false); // base membership recorded independently of why it was kept

    // A second error does not re-fire or change anything.
    const again = s.observe({ type: 'error', fields: { value: 'again' } });
    expect(again.fired).toEqual([]);
    expect(again.changed).toBe(false);
  });

  it('session C: HeadlessChrome is dropped at D; nothing armed, later events are ignored', () => {
    const s = createSession(parse(DOC), SID_IN_5);
    const { decision } = s.decide(bot);
    expect(decision.dropped).toBe(true);
    expect(decision.dropRuleId).toBe('no-bots');
    expect(decision.armed).toEqual([]);
    expect(s.verdict!.keptBy).toBeNull();
    expect(s.observe({ type: 'error', fields: {} }).changed).toBe(false);
  });

  it('a base-sampled session that also triggers reads both, with the trigger rule named', () => {
    const s = createSession(parse(DOC), SID_IN_5);
    s.decide(other);
    expect(s.verdict!.keptBy).toBe('sample');
    s.observe({ type: 'error', fields: {} });
    expect(s.verdict!.keptBy).toBe('both');
    expect(s.verdict!.keptByRule).toBe('errors');
  });

  it('pending: a trigger seen before D is queued and resolved at D, not evaluated early', () => {
    const s = createSession(parse(DOC), SID_OUT);
    const early = s.observe({ type: 'error', fields: { value: 'early' } });
    expect(early.fired).toEqual([]);
    expect(s.decision).toBeNull();
    expect(s.pending).toHaveLength(1);
    const { fired } = s.decide(other);
    expect(fired.map((f) => f.ruleId)).toEqual(['errors']);
    expect(s.verdict!.keptBy).toBe('trigger');
    expect(s.pending).toHaveLength(0);
  });

  it('pending events are discarded when D drops the session', () => {
    const s = createSession(parse(DOC), SID_OUT);
    s.observe({ type: 'error', fields: {} });
    const { fired } = s.decide(bot);
    expect(fired).toEqual([]);
    expect(s.verdict!.keptBy).toBeNull();
  });

  it('no base rate rule means rate 1.0 and no rule id', () => {
    const parsed = parse(doc([{ id: 'errors', trigger: { type: 'error' }, action: 'keep_session' }]));
    const d = decide(parsed, other, SID_OUT);
    expect(d.baseRuleId).toBeNull();
    expect(d.verdict.baseRate).toBe(1);
    expect(d.verdict.inBaseSample).toBe(true); // key < 1.0 always
  });

  it('precedence: rules without a trigger are evaluated in document order; the first match decides', () => {
    const dropFirst = parse(
      doc([
        { id: 'drop-internal', scope: { 'session.attributes.FI': 'acme' }, action: 'drop' },
        { id: 'base', action: 'keep_session', baseRate: 0.5 },
      ])
    );
    expect(decide(dropFirst, acme, SID_IN_5).dropped).toBe(true);
    expect(decide(dropFirst, other, SID_IN_5).dropped).toBe(false); // drop scope did not match
    expect(decide(dropFirst, other, SID_IN_5).baseRuleId).toBe('base');
    const baseFirst = parse(
      doc([
        { id: 'base', action: 'keep_session', baseRate: 0.5 },
        { id: 'drop-internal', scope: { 'session.attributes.FI': 'acme' }, action: 'drop' },
      ])
    );
    const d = decide(baseFirst, acme, SID_IN_5);
    expect(d.dropped).toBe(false); // the base rate came first, so it decides and the drop is unreachable
    expect(d.baseRuleId).toBe('base');
    expect(baseFirst.warnings).toHaveLength(1);
  });

  it('precedence: a drop is final; no trigger is armed for a dropped session', () => {
    const parsed = parse(
      doc([
        { id: 'no-bots', scope: { 'browser.userAgent': '*HeadlessChrome*' }, action: 'drop' },
        {
          id: 'bot-errors',
          trigger: { type: 'error' },
          scope: { 'browser.userAgent': '*HeadlessChrome*' },
          action: 'keep_session',
        },
        { id: 'default-base', action: 'keep_session', baseRate: 0.05 },
      ])
    );
    const d = decide(parsed, bot, SID_OUT);
    expect(d.dropped).toBe(true);
    expect(d.armed).toEqual([]);
    // A non-bot is not touched by the drop and gets the default rate.
    expect(decide(parsed, other, SID_OUT).baseRuleId).toBe('default-base');
  });

  it('the one base rate applies to every session that no drop rule excluded', () => {
    const parsed = parse(
      doc([
        { id: 'no-internal', scope: { 'session.attributes.FI': 'internal' }, action: 'drop' },
        { id: 'base', action: 'keep_session', baseRate: 0.3 },
      ])
    );
    for (const attrs of [acme, other, { 'browser.name': 'Firefox' }, {}]) {
      const d = decide(parsed, attrs, SID_OUT);
      expect(d.dropped).toBe(false);
      expect(d.baseRuleId).toBe('base');
      expect(d.verdict.baseRate).toBe(0.3);
    }
    expect(decide(parsed, { ...chrome, 'session.attributes.FI': 'internal' }, SID_OUT).dropped).toBe(true);
  });

  it('decide runs once', () => {
    const s = createSession(parse(DOC), SID_OUT);
    s.decide(other);
    expect(() => s.decide(acme)).toThrow(/only run once/);
  });

  it('verdict carries schema version, rules hash and key', () => {
    const parsed = parse(DOC);
    const s = createSession(parsed, SID_OUT);
    s.decide(other);
    expect(s.verdict!.schema).toBe(1);
    expect(s.verdict!.rulesHash).toBe(parsed.rulesHash);
    expect(s.verdict!.keyU32 / 4294967296).toBe(keyFraction(SID_OUT));
    // The id at D is the identity, and it is stamped verbatim (no hash, no normalisation).
    expect(s.verdict!.sessionId).toBe(SID_OUT);
  });
});

describe('rates', () => {
  it('triggerRate: deterministic per (session, rule); a miss does not re-roll on repeats', () => {
    const parsed = parse(DOC);
    const find = (want: boolean) => {
      for (let i = 0; i < 100_000; i++) {
        const s = `t${i}`;
        if (keyFraction(s) >= 0.5 && triggerKeyFraction(s, 'checkout-failed') < 0.5 === want) {
          return s;
        }
      }
      throw new Error('no id found');
    };
    const hit = find(true);
    const miss = find(false);
    const ev = { type: 'custom_event', fields: { name: 'checkout_failed' } };

    const sHit = createSession(parsed, hit);
    sHit.decide(other);
    const r1 = sHit.observe(ev);
    expect(r1.fired.map((f) => f.ruleId)).toEqual(['checkout-failed']);
    expect(sHit.verdict!.triggerRate).toBe(0.5);
    expect(sHit.verdict!.replayKept).toBe(true);

    const sMiss = createSession(parsed, miss);
    sMiss.decide(other);
    expect(sMiss.observe(ev).fired).toEqual([]);
    expect(sMiss.observe(ev).fired).toEqual([]); // no re-roll
    expect(sMiss.verdict!.keptBy).toBeNull();
  });

  it('triggerRate realised rate matches configured across many sessions', () => {
    const parsed = parse(DOC);
    let fired = 0;
    const n = 20_000;
    for (let i = 0; i < n; i++) {
      const s = createSession(parsed, `tr${i}`);
      s.decide(other);
      if (s.observe({ type: 'custom_event', fields: { name: 'checkout_failed' } }).fired.length) {
        fired++;
      }
    }
    expect(Math.abs(fired / n - 0.5)).toBeLessThan(0.02);
  });

  it('replayRate: a base-sampled keep_session_and_replay session records replay at replayRate, on its own roll', () => {
    const parsed = parse(doc([{ id: 'base', action: 'keep_session_and_replay', baseRate: 0.1, replayRate: 0.5 }]));
    let inBase = 0;
    let replay = 0;
    const n = 40_000;
    for (let i = 0; i < n; i++) {
      const d = decide(parsed, other, `rr${i}`);
      if (d.verdict.inBaseSample) {
        inBase++;
      }
      if (d.verdict.replayKept) {
        expect(d.verdict.inBaseSample).toBe(true); // replay never kept outside the base sample without a trigger
        replay++;
      }
    }
    expect(Math.abs(inBase / n - 0.1)).toBeLessThan(0.01);
    expect(Math.abs(replay / inBase - 0.5)).toBeLessThan(0.05);
    // The replay roll is keyed apart from the base roll.
    const d = decide(parsed, other, 'rr0');
    expect(d.verdict.replayKept).toBe(d.verdict.inBaseSample && keyU32('rr0\u0000replay\u0000') / 4294967296 < 0.5);
  });

  it('replayRate absent: keep_session_and_replay keeps replay for every base-sampled session; keep_session never does', () => {
    const withReplay = parse(doc([{ id: 'b', action: 'keep_session_and_replay', baseRate: 1 }]));
    const without = parse(doc([{ id: 'b', action: 'keep_session', baseRate: 1 }]));
    expect(decide(withReplay, other, 'x').verdict.replayKept).toBe(true);
    expect(decide(withReplay, other, 'x').verdict.replayRate).toBe(1);
    expect(decide(without, other, 'x').verdict.replayKept).toBe(false);
    expect(decide(without, other, 'x').verdict.replayRate).toBeNull();
  });

  it('rates of 0 are allowed and mean exactly that', () => {
    // baseRate 0: triggers only. Unlike drop, the triggers are still armed.
    const parsed = parse(
      doc([
        { id: 'no-base', action: 'keep_session_and_replay', baseRate: 0, replayRate: 0 },
        { id: 'errors', trigger: { type: 'error' }, action: 'keep_session_and_replay' },
        { id: 'never', trigger: { type: 'custom_event' }, action: 'keep_session', triggerRate: 0 },
      ])
    );
    for (let i = 0; i < 2_000; i++) {
      const s = createSession(parsed, `z${i}`);
      const { decision } = s.decide(other);
      expect(decision.dropped).toBe(false);
      expect(decision.verdict.inBaseSample).toBe(false);
      expect(decision.verdict.replayKept).toBe(false);
      expect(decision.armed).toHaveLength(2);
      // triggerRate 0 never fires
      expect(s.observe({ type: 'custom_event', fields: { name: 'x' } }).fired).toHaveLength(0);
    }
    // but a real trigger still keeps the session, replay included
    const s = createSession(parsed, 'z1');
    s.decide(other);
    const r = s.observe({ type: 'error', fields: { value: 'boom' } });
    expect(r.fired).toHaveLength(1);
    expect(s.verdict!.keptBy).toBe('trigger');
    expect(s.verdict!.replayKept).toBe(true);
  });

  it('attribute trigger: fires when a meta or session attribute is set to a matching value after D', () => {
    const parsed = parse(
      doc([
        { id: 'base', action: 'keep_session', baseRate: 0.05 },
        {
          id: 'paid-users',
          trigger: { type: 'attribute', match: { 'session.attributes.plan': 'paid' } },
          action: 'keep_session_and_replay',
        },
      ])
    );
    const s = createSession(parsed, SID_OUT);
    s.decide(other); // plan unknown at D, not in base sample
    expect(s.verdict!.keptBy).toBeNull();
    // the adapter turns a setSession/setUser call into an attribute event with the changed paths as fields
    expect(s.observe({ type: 'attribute', fields: { 'session.attributes.plan': 'free' } }).fired).toHaveLength(0);
    const r = s.observe({ type: 'attribute', fields: { 'session.attributes.plan': 'paid' } });
    expect(r.fired).toHaveLength(1);
    expect(s.verdict!.keptBy).toBe('trigger');
    expect(s.verdict!.keptByRule).toBe('paid-users');
    expect(s.verdict!.replayKept).toBe(true);
  });
});

describe('serialize and restore', () => {
  const roundTrip = (s: ReturnType<typeof createSession>) => JSON.parse(JSON.stringify(s.serialize()));

  it('round-trips a decided session: same verdict, same armed set, fired rules stay fired', () => {
    const parsed = parse(DOC);
    const s = createSession(parsed, SID_OUT);
    s.decide(other);
    s.observe({ type: 'custom_event', fields: { name: 'checkout_failed' } }); // fires or misses, either way remembered
    const before = JSON.stringify(s.verdict);

    const r = restoreSession(parsed, roundTrip(s))!;
    expect(r).not.toBeNull();
    expect(r.sessionId).toBe(SID_OUT);
    expect(JSON.stringify(r.verdict)).toBe(before);
    expect(r.decision!.armed.map((x) => x.rule.id)).toEqual(['errors', 'checkout-failed']);
    expect(r.pending).toHaveLength(0);
    // checkout-failed already rolled; it does not roll again on the restored session
    expect(r.observe({ type: 'custom_event', fields: { name: 'checkout_failed' } }).fired).toEqual([]);
    // a trigger that has not fired yet still can
    const e = r.observe({ type: 'error', fields: { value: 'boom' } });
    expect(e.fired.map((f) => f.ruleId)).toEqual(['errors']);
    expect(r.verdict!.keptBy).toBe('trigger');
    expect(() => r.decide(other)).toThrow(/only run once/);
  });

  it('round-trips a session before D: pending events survive and resolve at D', () => {
    const parsed = parse(DOC);
    const s = createSession(parsed, SID_OUT);
    s.observe({ type: 'error', fields: { value: 'early' } });
    const r = restoreSession(parsed, roundTrip(s))!;
    expect(r.decision).toBeNull();
    expect(r.pending).toHaveLength(1);
    const { fired } = r.decide(other);
    expect(fired.map((f) => f.ruleId)).toEqual(['errors']);
    expect(r.verdict!.keptBy).toBe('trigger');
  });

  it('round-trips a dropped session: still dropped, nothing fires', () => {
    const parsed = parse(DOC);
    const s = createSession(parsed, SID_IN_5);
    s.decide(bot);
    const r = restoreSession(parsed, roundTrip(s))!;
    expect(r.decision!.dropped).toBe(true);
    expect(r.decision!.dropRuleId).toBe('no-bots');
    expect(r.observe({ type: 'error', fields: {} }).changed).toBe(false);
  });

  it('returns null for state from a different rules document, a different session, or an unknown shape', () => {
    const parsed = parse(DOC);
    const s = createSession(parsed, SID_OUT);
    s.decide(other);
    const state = roundTrip(s);

    const changed = parse({
      ...DOC,
      rules: DOC.rules.map((r) => (r.id === 'default-base' ? { ...r, baseRate: 0.1 } : r)),
    });
    expect(restoreSession(changed, state)).toBeNull();
    expect(restoreSession(parsed, { ...state, sessionId: 'someone-else' })).toBeNull();
    expect(restoreSession(parsed, { ...state, v: 2 })).toBeNull();
    expect(restoreSession(parsed, null)).toBeNull();
    expect(restoreSession(parsed, 'garbage')).toBeNull();
    expect(restoreSession(parsed, { v: 1, sessionId: SID_OUT, decision: { verdict: 'no' } })).toBeNull();
  });

  it('drops armed rule ids the document no longer has, instead of failing', () => {
    const parsed = parse(DOC);
    const s = createSession(parsed, SID_OUT);
    s.decide(other);
    const state = roundTrip(s);
    state.decision.armedRuleIds.push('gone', 42);
    const r = restoreSession(parsed, state)!;
    expect(r.decision!.armed.map((x) => x.rule.id)).toEqual(['errors', 'checkout-failed']);
  });

  it('serialize() returns copies, so mutating the result does not touch the session', () => {
    const s = createSession(parse(DOC), SID_OUT);
    s.decide(other);
    const state = s.serialize();
    state.decision!.verdict.keptBy = 'both';
    expect(s.verdict!.keptBy).toBeNull();
  });
});
