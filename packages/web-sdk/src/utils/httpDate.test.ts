import { parseHttpDate } from './httpDate';

describe('parseHttpDate', () => {
  it('parses IMF-fixdate as UTC', () => {
    expect(parseHttpDate('Sun, 06 Nov 1994 08:49:37 GMT', 0)).toBe(784111777000);
  });

  it('parses the obsolete RFC 850 format', () => {
    expect(parseHttpDate('Sunday, 06-Nov-94 08:49:37 GMT', 1787702400000)).toBe(784111777000);
  });

  it.each(['Sun Nov  6 08:49:37 1994', 'Sun Nov 06 08:49:37 1994'])(
    'parses the obsolete asctime format: %s',
    (value) => {
      expect(parseHttpDate(value, 0)).toBe(784111777000);
    }
  );

  it.each([
    'Mon, 06 Nov 1994 08:49:37 GMT',
    'Tue, 31 Feb 2026 00:00:00 GMT',
    'Sun, 29 Feb 2026 00:00:00 GMT',
    'Mon, 29 Feb 2100 12:00:00 GMT',
    'Sun, 00 Nov 1994 08:49:37 GMT',
    'Tue, 32 Jan 1994 08:49:37 GMT',
    'Sun, 31 Apr 1994 08:49:37 GMT',
    'Mon, 06 Nov 1899 08:49:37 GMT',
    'Monday, 06-Nov-94 08:49:37 GMT',
    'Mon Nov  6 08:49:37 1994',
    'Sun, 06 Nov 1994 24:00:00 GMT',
    'Sun, 06 Nov 1994 23:60:00 GMT',
    'Sun, 06 Nov 1994 23:59:61 GMT',
  ])('rejects a semantically invalid HTTP-date: %s', (value) => {
    expect(parseHttpDate(value, 1787702400000)).toBeUndefined();
  });

  it.each([
    ['Sun, 06 Nov 1994 08:49:60 GMT', 784111800000],
    ['Sat, 31 Dec 2016 23:59:60 GMT', 1483228800000],
    ['Saturday, 31-Dec-16 23:59:60 GMT', 1483228800000],
    ['Sat Dec 31 23:59:60 2016', 1483228800000],
  ])('maps a valid leap second to the next representable instant: %s', (value, expected) => {
    expect(parseHttpDate(value, 1451606400000)).toBe(expected);
  });

  it.each([
    ['Wednesday, 26-Aug-76 12:00:00 GMT', 3365668800000],
    ['Thursday, 26-Aug-76 12:00:01 GMT', 209908801000],
  ])('resolves an RFC 850 year at the rolling 50-year boundary: %s', (value, expected) => {
    expect(parseHttpDate(value, 1787745600000)).toBe(expected);
  });

  it('includes reference milliseconds in the RFC 850 boundary', () => {
    expect(parseHttpDate('Wednesday, 26-Aug-76 12:00:00 GMT', 1787745600001)).toBe(3365668800000);
  });

  it('resolves the RFC 850 boundary without normalizing a leap-day reference', () => {
    expect(parseHttpDate('Wednesday, 01-Mar-50 00:00:00 GMT', 951782400000)).toBe(-626054400000);
  });

  it.each([
    ['Saturday, 01-Jan-00 00:00:00 GMT', 946684799000, 946684800000],
    ['Friday, 31-Dec-99 23:59:59 GMT', 946684800000, 946684799000],
    ['Friday, 01-Jan-00 00:00:00 GMT', 4102444799000, 4102444800000],
  ])('resolves an RFC 850 year across a century boundary: %s', (value, referenceTime, expected) => {
    expect(parseHttpDate(value, referenceTime)).toBe(expected);
  });

  it.each([
    ['Mon, 01 Jan 1900 00:00:00 GMT', -2208988800000],
    ['Tue, 29 Feb 2000 12:00:00 GMT', 951825600000],
    ['Thu, 29 Feb 2024 12:00:00 GMT', 1709208000000],
    ['Fri, 31 Dec 9999 23:59:59 GMT', 253402300799000],
  ])('accepts a semantic HTTP-date boundary: %s', (value, expected) => {
    expect(parseHttpDate(value, 0)).toBe(expected);
  });

  it.each([
    ['Mon, 01 Jan 2024 00:00:00 GMT', '2024-01-01T00:00:00Z'],
    ['Thu, 01 Feb 2024 00:00:00 GMT', '2024-02-01T00:00:00Z'],
    ['Fri, 01 Mar 2024 00:00:00 GMT', '2024-03-01T00:00:00Z'],
    ['Mon, 01 Apr 2024 00:00:00 GMT', '2024-04-01T00:00:00Z'],
    ['Wed, 01 May 2024 00:00:00 GMT', '2024-05-01T00:00:00Z'],
    ['Sat, 01 Jun 2024 00:00:00 GMT', '2024-06-01T00:00:00Z'],
    ['Mon, 01 Jul 2024 00:00:00 GMT', '2024-07-01T00:00:00Z'],
    ['Thu, 01 Aug 2024 00:00:00 GMT', '2024-08-01T00:00:00Z'],
    ['Sun, 01 Sep 2024 00:00:00 GMT', '2024-09-01T00:00:00Z'],
    ['Tue, 01 Oct 2024 00:00:00 GMT', '2024-10-01T00:00:00Z'],
    ['Fri, 01 Nov 2024 00:00:00 GMT', '2024-11-01T00:00:00Z'],
    ['Sun, 01 Dec 2024 00:00:00 GMT', '2024-12-01T00:00:00Z'],
  ])('accepts every RFC month token: %s', (value, expectedIso) => {
    expect(parseHttpDate(value, 0)).toBe(Date.parse(expectedIso));
  });

  it.each([
    ['Sunday, 06-Nov-94 08:49:37 GMT', '1994-11-06T08:49:37Z'],
    ['Monday, 07-Nov-94 08:49:37 GMT', '1994-11-07T08:49:37Z'],
    ['Tuesday, 08-Nov-94 08:49:37 GMT', '1994-11-08T08:49:37Z'],
    ['Wednesday, 09-Nov-94 08:49:37 GMT', '1994-11-09T08:49:37Z'],
    ['Thursday, 10-Nov-94 08:49:37 GMT', '1994-11-10T08:49:37Z'],
    ['Friday, 11-Nov-94 08:49:37 GMT', '1994-11-11T08:49:37Z'],
    ['Saturday, 12-Nov-94 08:49:37 GMT', '1994-11-12T08:49:37Z'],
  ])('accepts every long RFC weekday token: %s', (value, expectedIso) => {
    expect(parseHttpDate(value, 1787702400000)).toBe(Date.parse(expectedIso));
  });

  it.each([
    '',
    '1994-11-06T08:49:37Z',
    'Sun, 6 Nov 1994 08:49:37 GMT',
    'Sunday, 06 Nov 1994 08:49:37 GMT',
    'Sunday, 06-Nov-1994 08:49:37 GMT',
    'Sunday, 6-Nov-94 08:49:37 GMT',
    'sun, 06 Nov 1994 08:49:37 GMT',
    'Sun, 06 nov 1994 08:49:37 GMT',
    'Sun, 06 Nov 1994 08:49:37 gmt',
    'Sun, 06 Nov 1994 08:49:37 UTC',
    'Sun, 06 Nov 1994 08:49:37 +0000',
    ' Sun, 06 Nov 1994 08:49:37 GMT',
    'Sun, 06 Nov 1994 08:49:37 GMT ',
    'Sun,  06 Nov 1994 08:49:37 GMT',
    'Sun,\t06 Nov 1994 08:49:37 GMT',
    'Sun, ٠6 Nov 1994 08:49:37 GMT',
    'Sun Nov 6 08:49:37 1994',
    'Sun Nov   6 08:49:37 1994',
    'Sun Nov  06 08:49:37 1994',
    'Sun Nov  6 08:49:37 1994 GMT',
    'Sun, 06 Nov 10000 08:49:37 GMT',
  ])('rejects a value outside the exact RFC grammar: %s', (value) => {
    expect(parseHttpDate(value, 1787702400000)).toBeUndefined();
  });
});
