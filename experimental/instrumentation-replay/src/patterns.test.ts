import { hasAnyPatternEnabled, isCreditCard, isUsAddress, isUsSsn, valueMatchesEnabledPattern } from './patterns';

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
