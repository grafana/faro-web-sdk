import { matchesAnyUrl, matchesUrl, normalizeUrlMatchers } from './urlMatcher';

describe('url matchers', () => {
  const pageUrl = 'https://app.example.test/orders?view=list#/current';

  it('matches exact full URLs including query and fragment', () => {
    const [matcher] = normalizeUrlMatchers([
      { pattern: 'https://api.example.test/orders?view=list#/current', target: 'full-url' },
    ]);

    expect(matchesUrl(matcher!, 'https://api.example.test/orders?view=list#/current', pageUrl)).toBe(true);
    expect(matchesUrl(matcher!, 'https://api.example.test/orders?view=grid#/current', pageUrl)).toBe(false);
    expect(matchesUrl(matcher!, 'https://api.example.test/orders?view=list#/other', pageUrl)).toBe(false);
  });

  it('keeps full-url matching origin-sensitive and strings exact rather than prefix-based', () => {
    const [matcher] = normalizeUrlMatchers([{ pattern: 'https://api.example.test/orders', target: 'full-url' }]);

    expect(matchesUrl(matcher!, 'https://api.example.test/orders', pageUrl)).toBe(true);
    expect(matchesUrl(matcher!, 'https://other.example.test/orders', pageUrl)).toBe(false);
    expect(matchesUrl(matcher!, 'https://api.example.test/orders/123', pageUrl)).toBe(false);
  });

  it('uses pathname without query or hash', () => {
    const [matcher] = normalizeUrlMatchers([{ pattern: '/orders', target: 'pathname' }]);

    expect(matchesUrl(matcher!, pageUrl, pageUrl)).toBe(true);
    expect(matchesUrl(matcher!, 'https://app.example.test/orders/123?x=1#details', pageUrl)).toBe(false);
  });

  it('normalizes relative URL input against the current page URL', () => {
    const [fullUrl] = normalizeUrlMatchers([{ pattern: '/api/orders', target: 'full-url' }]);
    const [pathname] = normalizeUrlMatchers([{ pattern: 'api/orders', target: 'pathname' }]);

    expect(matchesUrl(fullUrl!, '/api/orders', pageUrl)).toBe(true);
    expect(matchesUrl(fullUrl!, 'https://app.example.test/api/orders', pageUrl)).toBe(true);
    expect(matchesUrl(pathname!, 'api/orders', 'https://app.example.test/')).toBe(true);
  });

  it('freezes relative string patterns against the registration page URL', () => {
    const [matcher] = normalizeUrlMatchers(
      [{ pattern: '/api/orders', target: 'full-url' }],
      undefined,
      'https://app.example.test/initial'
    );

    expect(matchesUrl(matcher!, 'https://app.example.test/api/orders', 'https://app.example.test/changed')).toBe(true);
    expect(matchesUrl(matcher!, 'https://app.example.test/other', 'https://app.example.test/changed')).toBe(false);
  });

  it('evaluates global and sticky regexes from zero without mutating caller state', () => {
    const global = /api\/orders/g;
    const sticky = /\/api\/orders/y;
    global.lastIndex = 8;
    sticky.lastIndex = 4;
    const [globalMatcher] = normalizeUrlMatchers([{ pattern: global, target: 'pathname' }]);
    const [stickyMatcher] = normalizeUrlMatchers([{ pattern: sticky, target: 'pathname' }]);

    expect(matchesUrl(globalMatcher!, '/api/orders', pageUrl)).toBe(true);
    expect(matchesUrl(globalMatcher!, '/api/orders', pageUrl)).toBe(true);
    expect(matchesUrl(stickyMatcher!, '/api/orders', pageUrl)).toBe(true);
    expect(global.lastIndex).toBe(8);
    expect(sticky.lastIndex).toBe(4);
  });

  it('retains valid entries while warning for malformed configuration', () => {
    const warn = jest.fn();
    const matchers = normalizeUrlMatchers(
      [
        { pattern: '/valid', target: 'pathname' },
        { pattern: 42, target: 'pathname' },
        { pattern: '/bad-target', target: 'query' },
      ],
      warn
    );

    expect(matchers).toHaveLength(1);
    expect(warn).toHaveBeenCalledTimes(2);
    expect(normalizeUrlMatchers({ pattern: '/invalid', target: 'pathname' }, warn)).toEqual([]);
    expect(warn).toHaveBeenCalledTimes(3);
  });

  it('matches when any valid matcher claims the URL', () => {
    const matchers = normalizeUrlMatchers([
      { pattern: '/not-this', target: 'pathname' },
      { pattern: /orders/, target: 'pathname' },
    ]);

    expect(matchesAnyUrl(matchers, pageUrl, pageUrl)).toBe(true);
  });
});
