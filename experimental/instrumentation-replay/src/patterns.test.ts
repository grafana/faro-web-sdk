import {
  elementIndicatesSensitiveField,
  hasAnyPatternEnabled,
  isCreditCard,
  isUsAddress,
  isUsSsn,
  valueMatchesEnabledPattern,
} from './patterns';

function makeElement(autocomplete: string | null): HTMLElement {
  return {
    getAttribute: (name: string) => (name === 'autocomplete' ? autocomplete : null),
  } as unknown as HTMLElement;
}

describe('isUsSsn', () => {
  it.each([
    ['formatted with dashes', '123-45-6789'],
    ['nine contiguous digits', '123456789'],
    ['leading/trailing whitespace', '  123-45-6789  '],
  ])('matches %s', (_label, value) => {
    expect(isUsSsn(value)).toBe(true);
  });

  it.each([
    ['SSA-disallowed area 000', '000-12-3456'],
    ['SSA-disallowed area 666', '666-12-3456'],
    ['SSA-disallowed area 9XX', '900-12-3456'],
    ['SSA-disallowed group 00', '123-00-3456'],
    ['SSA-disallowed serial 0000', '123-45-0000'],
    ['too short', '12-34-5678'],
    ['too long', '12345-67-890'],
    ['letters', '12A-45-6789'],
    ['phone-like format', '(123) 45-6789'],
  ])('rejects %s', (_label, value) => {
    expect(isUsSsn(value)).toBe(false);
  });
});

describe('isCreditCard', () => {
  it.each([
    ['Visa 16-digit no separators', '4111111111111111'],
    ['Visa 16-digit dash-separated', '4111-1111-1111-1111'],
    ['Visa 16-digit space-separated', '4111 1111 1111 1111'],
    ['Amex 15-digit', '378282246310005'],
    ['Diners 14-digit', '30569309025904'],
    ['Maestro 19-digit', '6014111111111111114'],
  ])('matches Luhn-valid %s', (_label, value) => {
    expect(isCreditCard(value)).toBe(true);
  });

  it.each([
    ['16-digit Luhn-invalid (likely order ID)', '1234567890123456'],
    ['12 digits', '411111111111'],
    ['20 digits', '41111111111111111111'],
    ['letters interleaved', '4111-1A11-1111-1111'],
    ['empty string', ''],
  ])('rejects %s', (_label, value) => {
    expect(isCreditCard(value)).toBe(false);
  });
});

describe('isUsAddress', () => {
  it.each([
    ['standard 5-digit ZIP', '123 Main St, Springfield, IL, 62704'],
    ['ZIP+4', '742 Evergreen Terrace, Springfield, OR, 97477-1234'],
    ['apostrophe in street', "1600 O'Brien Way, Apex, NC, 27502"],
    ['hyphenated city', '1 Park Pl, Winston-Salem, NC, 27101'],
    ['no comma before ZIP', '123 Main St, Springfield, IL 62704'],
  ])('matches %s', (_label, value) => {
    expect(isUsAddress(value)).toBe(true);
  });

  it.each([
    ['just a city/state', 'Springfield, IL'],
    ['missing state', '123 Main St, Springfield, 62704'],
    ['no street number', 'Main St, Springfield, IL, 62704'],
    ['ZIP too short', '123 Main St, Springfield, IL, 6270'],
    ['random text', '123 reviews on this page'],
  ])('rejects %s', (_label, value) => {
    expect(isUsAddress(value)).toBe(false);
  });
});

describe('valueMatchesEnabledPattern', () => {
  it('returns false when no patterns are enabled', () => {
    expect(valueMatchesEnabledPattern('123-45-6789', { password: true })).toBe(false);
  });

  it('returns false when the matching pattern is disabled', () => {
    expect(valueMatchesEnabledPattern('123-45-6789', { creditCard: true })).toBe(false);
  });

  it('returns true when an enabled pattern matches', () => {
    expect(valueMatchesEnabledPattern('123-45-6789', { ssn: true })).toBe(true);
    expect(valueMatchesEnabledPattern('4111111111111111', { creditCard: true })).toBe(true);
    expect(valueMatchesEnabledPattern('123 Main St, Springfield, IL, 62704', { usAddress: true })).toBe(true);
  });

  it('returns false when options is undefined', () => {
    expect(valueMatchesEnabledPattern('123-45-6789', undefined)).toBe(false);
  });
});

describe('hasAnyPatternEnabled', () => {
  it('returns false for undefined options', () => {
    expect(hasAnyPatternEnabled(undefined)).toBe(false);
  });

  it('returns false when only input-type keys are set', () => {
    expect(hasAnyPatternEnabled({ password: true, email: true })).toBe(false);
  });

  it.each([{ ssn: true }, { creditCard: true }, { usAddress: true }])('returns true for %o', (opts) => {
    expect(hasAnyPatternEnabled(opts)).toBe(true);
  });
});

describe('elementIndicatesSensitiveField', () => {
  it('returns false for undefined options', () => {
    expect(elementIndicatesSensitiveField(makeElement('cc-number'), undefined)).toBe(false);
  });

  it('returns false when the element has no autocomplete attribute', () => {
    expect(elementIndicatesSensitiveField(makeElement(null), { creditCard: true })).toBe(false);
    expect(elementIndicatesSensitiveField(makeElement(''), { creditCard: true })).toBe(false);
  });

  it('returns false when the element has no getAttribute (defensive)', () => {
    const bare = { tagName: 'INPUT' } as unknown as HTMLElement;
    expect(elementIndicatesSensitiveField(bare, { creditCard: true })).toBe(false);
  });

  it.each([
    'cc-number',
    'cc-csc',
    'cc-name',
    'cc-exp',
    'cc-exp-month',
    'cc-exp-year',
    'cc-type',
    'CC-NUMBER', // case-insensitive
  ])('creditCard: fires on autocomplete=%s', (value) => {
    expect(elementIndicatesSensitiveField(makeElement(value), { creditCard: true })).toBe(true);
  });

  it('creditCard: fires when cc-* token appears in a space-separated list', () => {
    expect(elementIndicatesSensitiveField(makeElement('section-billing cc-number'), { creditCard: true })).toBe(true);
    expect(elementIndicatesSensitiveField(makeElement('billing shipping cc-csc'), { creditCard: true })).toBe(true);
  });

  it('creditCard: does not fire when creditCard is off', () => {
    expect(elementIndicatesSensitiveField(makeElement('cc-number'), { ssn: true, usAddress: true })).toBe(false);
  });

  it.each(['street-address', 'address-line1', 'address-line2', 'address-line3', 'ADDRESS-LINE1'])(
    'usAddress: fires on autocomplete=%s',
    (value) => {
      expect(elementIndicatesSensitiveField(makeElement(value), { usAddress: true })).toBe(true);
    }
  );

  it('usAddress: fires when address token appears in a space-separated list', () => {
    expect(elementIndicatesSensitiveField(makeElement('section-billing address-line1'), { usAddress: true })).toBe(
      true
    );
  });

  it('usAddress: does not fire on address-level* / postal-code (out of scope)', () => {
    expect(elementIndicatesSensitiveField(makeElement('address-level1'), { usAddress: true })).toBe(false);
    expect(elementIndicatesSensitiveField(makeElement('address-level2'), { usAddress: true })).toBe(false);
    expect(elementIndicatesSensitiveField(makeElement('postal-code'), { usAddress: true })).toBe(false);
  });

  it('ssn: does not fire (no standard autocomplete value exists)', () => {
    expect(elementIndicatesSensitiveField(makeElement('ssn'), { ssn: true })).toBe(false);
    expect(elementIndicatesSensitiveField(makeElement('one-time-code'), { ssn: true })).toBe(false);
  });

  it('ignores unrelated autocomplete values', () => {
    expect(elementIndicatesSensitiveField(makeElement('email'), { creditCard: true, usAddress: true, ssn: true })).toBe(
      false
    );
    expect(elementIndicatesSensitiveField(makeElement('off'), { creditCard: true, usAddress: true, ssn: true })).toBe(
      false
    );
  });
});
