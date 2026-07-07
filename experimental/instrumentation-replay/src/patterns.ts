import { type MaskInputOptions, PATTERN_MASK_KEYS, type PatternMaskKey } from './types';

/**
 * Value-pattern detectors for the SSN / credit-card / US-address keys on
 * `MaskInputOptions`. These are intentionally conservative so they don't
 * over-mask non-PII values that happen to share a digit count.
 *
 * See https://github.com/grafana/faro-web-sdk/issues/2169.
 */

// XXX-XX-XXXX or 9 contiguous digits, anchored so we don't match digits
// embedded in a longer string of digits.
const SSN_REGEX = /^\s*(?!000|666|9\d{2})\d{3}-?(?!00)\d{2}-?(?!0000)\d{4}\s*$/;

// 13-19 digits with optional space or dash separators, anchored. Common
// PAN lengths: Visa/Mastercard 16, Amex 15, Diners 14, Maestro 19.
const PAN_DIGITS_REGEX = /^\s*\d(?:[\s-]?\d){12,18}\s*$/;

// Conservative US address shape on a single line:
//   "<number> <street...>, <city>, <ST>, <ZIP>"
// ZIP may be 5 or 9 digits; state is two letters.
const US_ADDRESS_REGEX = /^\s*\d+\s+[A-Za-z0-9.'\- ]+,\s*[A-Za-z.'\- ]+,\s*[A-Za-z]{2},?\s*\d{5}(?:-\d{4})?\s*$/;

export function isUsSsn(value: string): boolean {
  return SSN_REGEX.test(value);
}

export function isCreditCard(value: string): boolean {
  if (!PAN_DIGITS_REGEX.test(value)) {
    return false;
  }
  return luhnValid(value.replace(/[\s-]/g, ''));
}

export function isUsAddress(value: string): boolean {
  return US_ADDRESS_REGEX.test(value);
}

/**
 * Standard Luhn (mod-10) checksum. Input must be all digits.
 */
function luhnValid(digits: string): boolean {
  let sum = 0;
  let shouldDouble = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = digits.charCodeAt(i) - 48;
    if (n < 0 || n > 9) {
      return false;
    }
    if (shouldDouble) {
      n *= 2;
      if (n > 9) {
        n -= 9;
      }
    }
    sum += n;
    shouldDouble = !shouldDouble;
  }
  return sum > 0 && sum % 10 === 0;
}

const PATTERN_DETECTORS: Record<PatternMaskKey, (value: string) => boolean> = {
  ssn: isUsSsn,
  creditCard: isCreditCard,
  usAddress: isUsAddress,
};

/**
 * Returns true if `value` matches any pattern enabled in `options`.
 */
export function valueMatchesEnabledPattern(value: string, options: MaskInputOptions | undefined): boolean {
  if (!options) {
    return false;
  }
  for (const key of PATTERN_MASK_KEYS) {
    if (options[key] && PATTERN_DETECTORS[key](value)) {
      return true;
    }
  }
  return false;
}

/**
 * Returns true if at least one pattern key is enabled in `options`.
 */
export function hasAnyPatternEnabled(options: MaskInputOptions | undefined): boolean {
  if (!options) {
    return false;
  }
  return PATTERN_MASK_KEYS.some((k) => options[k]);
}
