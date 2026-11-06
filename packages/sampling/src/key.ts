// The sampling key and the three rolls. Specified in the adaptive sampling design doc and
// pinned by the vectors in grafana/faro under spec/sampling/ (mirrored in ./__vectors__).
//
//   step 1: FNV-1a 32-bit over the UTF-8 bytes of the input
//             h = 0x811C9DC5; for each byte b: h = (h XOR b) * 0x01000193  mod 2^32
//   step 2: MurmurHash3 fmix32 finalizer
//             h = (h XOR (h >> 16)) * 0x85EBCA6B  mod 2^32
//             h = (h XOR (h >> 13)) * 0xC2B2AE35  mod 2^32
//             h =  h XOR (h >> 16)
//   output: keyU32 = h; a roll passes when keyU32 / 2^32 < rate
//
// Every multiply wraps mod 2^32 and every shift is a logical right shift. In JavaScript
// that means Math.imul (the plain product of two 32-bit values exceeds 2^53 and loses low
// bits) and >>> for shifts. The same function exists bit for bit on every platform and in
// the collector's recompute; the vectors are the contract.

const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

const TWO_POW_32 = 4294967296;

let encoder: TextEncoder | undefined | null;

/**
 * UTF-8 bytes of a string. Uses TextEncoder where it exists. The package ships to every
 * browser with ES module support, and Edge 16 to 18 are in that set without TextEncoder, so
 * the fallback below does the same encoding by hand. It has to agree with TextEncoder byte
 * for byte, lone surrogates included (TextEncoder writes U+FFFD for those), because the
 * vectors pin the hash of every input.
 */
function utf8(input: string): Uint8Array {
  if (encoder === undefined) {
    encoder = typeof TextEncoder === 'function' ? new TextEncoder() : null;
  }
  return encoder ? encoder.encode(input) : encodeUtf8(input);
}

/** The hand-written UTF-8 encoder behind utf8(). Exported for the tests only. */
export function encodeUtf8(input: string): Uint8Array {
  const out: number[] = [];
  for (let i = 0; i < input.length; i++) {
    let cp = input.charCodeAt(i);
    if (cp >= 0xd800 && cp <= 0xdbff) {
      const next = i + 1 < input.length ? input.charCodeAt(i + 1) : 0;
      if (next >= 0xdc00 && next <= 0xdfff) {
        cp = 0x10000 + ((cp - 0xd800) << 10) + (next - 0xdc00);
        i++;
      } else {
        cp = 0xfffd;
      }
    } else if (cp >= 0xdc00 && cp <= 0xdfff) {
      cp = 0xfffd;
    }
    if (cp < 0x80) {
      out.push(cp);
    } else if (cp < 0x800) {
      out.push(0xc0 | (cp >> 6), 0x80 | (cp & 0x3f));
    } else if (cp < 0x10000) {
      out.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
    } else {
      out.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3f), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
    }
  }
  return new Uint8Array(out);
}

/** FNV-1a 32-bit over UTF-8 bytes, as an unsigned 32-bit integer. */
export function fnv1a32(input: string): number {
  const bytes = utf8(input);
  let h = FNV_OFFSET;
  for (let i = 0; i < bytes.length; i++) {
    h ^= bytes[i]!;
    h = Math.imul(h, FNV_PRIME) >>> 0;
  }
  return h >>> 0;
}

/** MurmurHash3 fmix32 finalizer over an unsigned 32-bit integer. */
export function fmix32(h: number): number {
  h >>>= 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}

/** The sampling key as an unsigned 32-bit integer. This is what gets stamped as keyU32. */
export function keyU32(input: string): number {
  return fmix32(fnv1a32(input));
}

/** The sampling key as a fraction in [0, 1). Compare with `<` against a rate. */
export function keyFraction(sessionId: string): number {
  return keyU32(sessionId) / TWO_POW_32;
}

/**
 * Roll inputs. Three rolls per session, all from the session id, each in its own domain so
 * no two can ever hash the same input:
 *
 *   base roll:     keyU32(sessionId)
 *   replay roll:   keyU32(sessionId + "\0replay\0")
 *   trigger roll:  keyU32(sessionId + "\0trigger\0" + ruleId)
 *
 * Session ids match ^[a-zA-Z0-9_.@:-]+$ and rule ids ^[A-Za-z0-9_-]{1,64}$, so neither can
 * contain NUL and the three inputs are distinct by construction.
 */
export function replayRollInput(sessionId: string): string {
  return sessionId + '\u0000replay\u0000';
}

export function triggerRollInput(sessionId: string, ruleId: string): string {
  return sessionId + '\u0000trigger\u0000' + ruleId;
}

/** The replay roll as a fraction in [0, 1). A base-sampled session records replay when this is < replayRate. */
export function replayKeyFraction(sessionId: string): number {
  return keyU32(replayRollInput(sessionId)) / TWO_POW_32;
}

/** The triggerRate roll for (session, rule) as a fraction in [0, 1). Recomputable server-side from (sessionId, keptByRule). */
export function triggerKeyFraction(sessionId: string, ruleId: string): number {
  return keyU32(triggerRollInput(sessionId, ruleId)) / TWO_POW_32;
}

/**
 * Content hash of the canonicalised rules document (rulesHash). FNV-1a 64-bit as 16 lowercase
 * hex characters. An audit identifier, not a security hash, and never an input to the key.
 *
 * Done on two 32-bit halves rather than BigInt, because the package targets ES2015 and ships
 * to every browser with ES module support, some of which predate BigInt. The FNV-1a 64 prime
 * is 2^40 + 0x1b3, so h * prime mod 2^64 is (h << 40) + h * 0x1b3, and every intermediate
 * product here stays below 2^53, so plain number arithmetic is exact.
 */
export function fnv1a64Hex(input: string): string {
  const bytes = utf8(input);
  let hi = 0xcbf29ce4;
  let lo = 0x84222325;
  for (let i = 0; i < bytes.length; i++) {
    lo = (lo ^ bytes[i]!) >>> 0;
    // h * 0x1b3: lo * 0x1b3 < 2^41, exact; the carry into the high half is its upper bits.
    const lo435 = lo * 0x1b3;
    const carry = Math.floor(lo435 / TWO_POW_32);
    const hi435 = (hi * 0x1b3 + carry) % TWO_POW_32;
    // h << 40: only the low 24 bits of lo survive, shifted into the high half; hi falls off.
    const shifted = (lo << 8) >>> 0;
    hi = (shifted + hi435) % TWO_POW_32;
    lo = lo435 % TWO_POW_32;
  }
  return hex32(hi) + hex32(lo);
}

function hex32(n: number): string {
  const s = n.toString(16);
  return '00000000'.slice(s.length) + s;
}
