import keysVectors from './__vectors__/keys.json';
import rollsVectors from './__vectors__/rolls.json';
import rulesHashVectors from './__vectors__/rules-hash.json';
import {
  encodeUtf8,
  fmix32,
  fnv1a32,
  fnv1a64Hex,
  keyFraction,
  keyU32,
  replayKeyFraction,
  replayRollInput,
  triggerKeyFraction,
  triggerRollInput,
} from './key';

// The known-answer vectors from the design doc. Every SDK and the collector's Go recompute
// reproduce these exactly; the full set lives in __vectors__ and is checked below.
const VECTORS: [string, number, number][] = [
  ['', 0x811c9dc5, 0xab3e7c0b],
  ['a', 0xe40c292c, 0x1a80b1b3],
  ['foobar', 0xbf9cf968, 0x0c0da6dc],
  ['aB3kZ9pQx7', 0x3a101663, 0x28b79e88],
  ['550e8400-e29b-41d4-a716-446655440000', 0x889e3528, 0x96e49d5d],
  ['sess_0001000000', 0xc984782f, 0x3b83525b],
  ['ünïcödé', 0x30eaf7d2, 0x732c3f23],
];

// A seeded generator (mulberry32) so the "random" id shapes are the same ids on every run.
// With true randomness a 3% tolerance at N=100k is only 2.2 sigma, and four random shapes
// would fail about one run in ten.
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = seeded(20261105);

const ALPHABET = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
function genShortID(len = 10): string {
  let s = '';
  for (let i = 0; i < len; i++) {
    s += ALPHABET[Math.floor(rnd() * ALPHABET.length)];
  }
  return s;
}
function fakeUuid(): string {
  const hex = () => Math.floor(rnd() * 16).toString(16);
  const h = (n: number) => Array.from({ length: n }, hex).join('');
  return `${h(8)}-${h(4)}-4${h(3)}-${h(4)}-${h(12)}`;
}

describe('sampling key', () => {
  it('reproduces the known-answer vectors: FNV-1a step and final key', () => {
    for (const [input, fnv, key] of VECTORS) {
      expect(fnv1a32(input)).toBe(fnv);
      expect(keyU32(input)).toBe(key);
      expect(fmix32(fnv)).toBe(key);
    }
  });

  it('reproduces every vector published in grafana/faro spec/sampling/keys.json', () => {
    expect(keysVectors.length).toBeGreaterThan(10000);
    for (const v of keysVectors) {
      expect(fnv1a32(v.id)).toBe(v.fnv1a32);
      expect(keyU32(v.id)).toBe(v.key_u32);
    }
  });

  it('reproduces the roll inputs and keys in spec/sampling/rolls.json', () => {
    for (const v of rollsVectors) {
      expect(keyU32(v.sessionId)).toBe(v.base.key_u32);
      expect(replayRollInput(v.sessionId)).toBe(v.replay.input);
      expect(keyU32(replayRollInput(v.sessionId))).toBe(v.replay.key_u32);
      for (const ruleId of Object.keys(v.triggers)) {
        const t = v.triggers[ruleId as keyof typeof v.triggers];
        expect(triggerRollInput(v.sessionId, ruleId)).toBe(t.input);
        expect(keyU32(triggerRollInput(v.sessionId, ruleId))).toBe(t.key_u32);
      }
    }
  });

  it('key fraction is in [0, 1) and matches the vectors to 9 decimals', () => {
    expect(keyFraction('').toFixed(9)).toBe('0.668922188');
    expect(keyFraction('foobar').toFixed(9)).toBe('0.047083310');
    for (let i = 0; i < 10_000; i++) {
      const f = keyFraction(genShortID(16));
      expect(f >= 0 && f < 1).toBe(true);
    }
  });

  it('hashes UTF-8 bytes, not UTF-16 code units', () => {
    // "é" is one UTF-16 unit but two UTF-8 bytes; the vector above pins the UTF-8 reading.
    expect(keyU32('ünïcödé')).not.toBe(keyU32('unicode'));
    expect(keyU32('ünïcödé')).toBe(0x732c3f23);
  });
});

// Conformance: the realised inclusion rate must match the configured rate on structured id
// shapes, not only on random ones. Customers can supply their own session ids.
const N = 100_000;
const RATE = 0.05;
const shapes: Record<string, (i: number) => string> = {
  genShortID: () => genShortID(),
  uuid: () => fakeUuid(),
  'prefix+random': () => 'acme-web-' + genShortID(8),
  'timestamp+random': (i) => `${1758000000000 + i * 137}-${genShortID(6)}`,
  sequential: (i) => String(1000000 + i),
  'prefix+sequential': (i) => 'sess_' + String(1000000 + i).padStart(10, '0'),
  'userId+counter': (i) => `u${(i % 5000) + 1}-${Math.floor(i / 5000) + 1}`,
};

describe('key distribution', () => {
  for (const name of Object.keys(shapes)) {
    it(`realised rate within 4% of configured on shape: ${name}`, () => {
      const gen = shapes[name]!;
      let kept = 0;
      for (let i = 0; i < N; i++) {
        if (keyFraction(gen(i)) < RATE) {
          kept++;
        }
      }
      const realised = kept / N / RATE;
      // sd of the ratio at N=100k, p=0.05 is about 0.014; 4% is roughly 3 sigma, and the ids
      // are seeded, so this either always passes or always fails.
      expect(Math.abs(realised - 1)).toBeLessThan(0.04);
    });
  }

  it('uniformity: chi-square over 100 bins on sequential ids is unremarkable', () => {
    const bins: number[] = new Array(100).fill(0);
    for (let i = 0; i < N; i++) {
      bins[Math.floor(keyFraction(String(1000000 + i)) * 100)]!++;
    }
    const e = N / 100;
    const chi = bins.reduce((s, x) => s + ((x - e) * (x - e)) / e, 0);
    // 99 degrees of freedom: expect about 99; p < 0.001 above ~149.
    expect(chi).toBeLessThan(160);
  });
});

describe('roll domains', () => {
  it('trigger key is per (session, rule) and cannot collide across the separator', () => {
    expect(triggerKeyFraction('ab', 'c')).not.toBe(triggerKeyFraction('a', 'bc'));
    expect(triggerKeyFraction('s', 'r')).toBe(triggerKeyFraction('s', 'r'));
    expect(triggerKeyFraction('s', 'errors')).not.toBe(triggerKeyFraction('s', 'checkout-failed'));
  });

  it("the three rolls live in separate domains: a rule named 'replay' does not share the replay roll", () => {
    for (const sid of ['s0', '550e8400-e29b-41d4-a716-446655440000', 'ünïcödé']) {
      expect(replayRollInput(sid)).not.toBe(triggerRollInput(sid, 'replay'));
      expect(replayKeyFraction(sid)).not.toBe(triggerKeyFraction(sid, 'replay'));
      expect(replayKeyFraction(sid)).not.toBe(keyFraction(sid));
      expect(triggerKeyFraction(sid, 'trigger')).not.toBe(keyFraction(sid));
    }
    // Independence in aggregate: with both rates at 0.5 the union keeps ~75%, not 50%.
    let union = 0;
    const n = 20_000;
    for (let i = 0; i < n; i++) {
      const sid = `sess_${i}`;
      if (replayKeyFraction(sid) < 0.5 || triggerKeyFraction(sid, 'replay') < 0.5) {
        union++;
      }
    }
    expect(Math.abs(union / n - 0.75)).toBeLessThan(0.01);
  });
});

describe('fnv1a64Hex', () => {
  it('is stable and 16 hex chars', () => {
    expect(fnv1a64Hex('')).toBe('cbf29ce484222325');
    expect(fnv1a64Hex('a')).toBe('af63dc4c8601ec8c');
    expect(fnv1a64Hex('anything')).toMatch(/^[0-9a-f]{16}$/);
  });

  it('reproduces every rulesHash in spec/sampling/rules-hash.json from its canonical form', () => {
    for (const v of rulesHashVectors) {
      expect(fnv1a64Hex(v.canonical)).toBe(v.rulesHash);
    }
  });

  it('agrees with a BigInt reference on long and non-ASCII input', () => {
    const enc = new TextEncoder();
    const reference = (s: string): string => {
      let h = BigInt('0xcbf29ce484222325');
      const prime = BigInt('0x100000001b3');
      const mask = BigInt('0xffffffffffffffff');
      for (const b of enc.encode(s)) {
        h ^= BigInt(b);
        h = (h * prime) & mask;
      }
      return h.toString(16).padStart(16, '0');
    };
    for (let i = 0; i < 2_000; i++) {
      const s = `${genShortID(1 + (i % 40))}-ünï-日本語-🙂-${i}`;
      expect(fnv1a64Hex(s)).toBe(reference(s));
    }
  });
});

describe('UTF-8 fallback (browsers without TextEncoder)', () => {
  const samples = [
    '',
    'a',
    'foobar',
    'ünïcödé',
    '日本語',
    '\u{1f600} emoji and \u{10ffff} max',
    'lone high surrogate \ud83d end',
    'lone low surrogate \ude00 end',
    'swapped pair \ude00\ud83d',
    'high then non-low \ud83dA',
    '\u0000 nul \u007f del \u0080 \u07ff \u0800 \uffff',
  ];

  it('encodeUtf8 agrees with TextEncoder byte for byte, lone surrogates included', () => {
    const te = new TextEncoder();
    for (const s of samples) {
      expect(Array.from(encodeUtf8(s))).toEqual(Array.from(te.encode(s)));
    }
    for (let i = 0; i < 2_000; i++) {
      const s = `${genShortID(1 + (i % 30))}-ünï-日本語-\u{1f600}-${i}`;
      expect(Array.from(encodeUtf8(s))).toEqual(Array.from(te.encode(s)));
    }
  });

  it('the key and rulesHash reproduce the vectors when TextEncoder is missing', () => {
    jest.isolateModules(() => {
      const saved = globalThis.TextEncoder;
      // @ts-expect-error simulating Edge 16 to 18
      delete globalThis.TextEncoder;
      try {
        const fresh = require('./key') as typeof import('./key');
        for (const [input, fnv, key] of VECTORS) {
          expect(fresh.fnv1a32(input)).toBe(fnv);
          expect(fresh.keyU32(input)).toBe(key);
        }
        for (const v of keysVectors.slice(0, 2_000)) {
          expect(fresh.keyU32(v.id)).toBe(v.key_u32);
        }
        for (const v of rulesHashVectors) {
          expect(fresh.fnv1a64Hex(v.canonical)).toBe(v.rulesHash);
        }
      } finally {
        globalThis.TextEncoder = saved;
      }
    });
  });
});
