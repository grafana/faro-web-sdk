import { UAParser } from 'ua-parser-js';

type UAResult = ReturnType<InstanceType<typeof UAParser>['getResult']>;

let cachedUA: string | undefined;
let cachedResult: UAResult | undefined;

// Browser and OS meta providers both need to parse navigator.userAgent.
// Cache keyed on the UA string so we parse at most once per unique UA
// (test mutations of navigator.userAgent invalidate naturally).
export function getUAResult(): UAResult {
  const currentUA = typeof navigator !== 'undefined' ? navigator.userAgent : '';

  if (cachedUA !== currentUA || !cachedResult) {
    cachedResult = new UAParser(currentUA).getResult();
    cachedUA = currentUA;
  }

  return cachedResult;
}
