import type { UrlMatcher, UrlMatcherTarget } from './types';

export type NormalizedUrlMatcher = UrlMatcher;

const FALLBACK_BASE_URL = 'http://localhost/';

function isRegExp(value: unknown): value is RegExp {
  return Object.prototype.toString.call(value) === '[object RegExp]';
}

function getBaseUrl(baseUrl?: string): string {
  return baseUrl ?? (typeof location !== 'undefined' ? location.href : FALLBACK_BASE_URL);
}

function toUrl(value: string, baseUrl?: string): URL | undefined {
  try {
    return new URL(value, getBaseUrl(baseUrl));
  } catch {
    return undefined;
  }
}

function normalizeStringPattern(pattern: string, target: UrlMatcherTarget, baseUrl?: string): string {
  const url = toUrl(pattern, baseUrl);

  if (!url) {
    return pattern;
  }

  return target === 'full-url' ? url.href : url.pathname;
}

function getMatchValue(url: string, target: UrlMatcherTarget, baseUrl?: string): string {
  const parsed = toUrl(url, baseUrl);

  if (!parsed) {
    return url;
  }

  return target === 'full-url' ? parsed.href : parsed.pathname;
}

function isTarget(value: unknown): value is UrlMatcherTarget {
  return value === 'full-url' || value === 'pathname';
}

function clonePattern(pattern: string | RegExp): string | RegExp {
  if (typeof pattern === 'string') {
    return pattern;
  }

  return new RegExp(pattern.source, pattern.flags);
}

/**
 * Validates matcher configuration while preserving valid entries. Regexes are cloned so later
 * matching cannot mutate the caller's `lastIndex` or observe changes to the original object.
 */
export function normalizeUrlMatchers(
  value: unknown,
  warn: (message: string) => void = () => undefined,
  baseUrl?: string
): NormalizedUrlMatcher[] {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    warn('URL matcher configuration must be an array; invalid matchers were ignored.');
    return [];
  }

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') {
      warn('Invalid URL matcher entry; the entry was ignored.');
      return [];
    }

    const candidate = entry as { pattern?: unknown; target?: unknown };
    const pattern = candidate.pattern;
    const target = candidate.target;

    if ((typeof pattern !== 'string' && !isRegExp(pattern)) || !isTarget(target)) {
      warn('Invalid URL matcher entry; the entry was ignored.');
      return [];
    }

    return [
      {
        pattern:
          typeof pattern === 'string' && baseUrl
            ? normalizeStringPattern(pattern, target, baseUrl)
            : clonePattern(pattern),
        target,
      },
    ];
  });
}

/**
 * Evaluates one matcher against a request or page URL. Strings are exact after URL normalization;
 * regular expressions run from zero on a clone and therefore preserve caller state, including for
 * global and sticky expressions.
 */
export function matchesUrl(matcher: NormalizedUrlMatcher, url: string, baseUrl?: string): boolean {
  const value = getMatchValue(url, matcher.target, baseUrl);

  if (typeof matcher.pattern === 'string') {
    return normalizeStringPattern(matcher.pattern, matcher.target, baseUrl) === value;
  }

  const regex = new RegExp(matcher.pattern.source, matcher.pattern.flags);
  regex.lastIndex = 0;
  return regex.test(value);
}

export function matchesAnyUrl(matchers: readonly NormalizedUrlMatcher[], url: string, baseUrl?: string): boolean {
  return matchers.some((matcher) => matchesUrl(matcher, url, baseUrl));
}
