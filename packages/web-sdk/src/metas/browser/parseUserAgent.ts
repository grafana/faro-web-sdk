// Lightweight browser and OS detection to replace ua-parser-js (~25KB minified).
// Only extracts browser name/version and OS name/version from the user-agent string.

interface ParsedBrowser {
  name: string | undefined;
  version: string | undefined;
}

interface ParsedOS {
  name: string | undefined;
  version: string | undefined;
}

export interface ParsedUserAgent {
  browser: ParsedBrowser;
  os: ParsedOS;
}

// Each entry: [regex, browser name, version group index (default 1)]
const browserRules: Array<[RegExp, string] | [RegExp, string, number]> = [
  [/\bOPR\/(\d+[\d.]*)/, 'Opera'],
  [/\bEdg(?:e|A|iOS)?\/(\d+[\d.]*)/, 'Edge'],
  [/\bSamsungBrowser\/(\d+[\d.]*)/, 'Samsung Internet'],
  [/\bUCBrowser\/(\d+[\d.]*)/, 'UC Browser'],
  [/\bYaBrowser\/(\d+[\d.]*)/, 'Yandex'],
  [/\bFirefox\/(\d+[\d.]*)/, 'Firefox'],
  [/\bCriOS\/(\d+[\d.]*)/, 'Chrome'],
  [/\bChrome\/(\d+[\d.]*)/, 'Chrome'],
  [/\bVersion\/(\d+[\d.]*).*Safari/, 'Safari'],
  [/\bMSIE (\d+[\d.]*)/, 'IE'],
  [/\brv:(\d+[\d.]*).*Trident/, 'IE'],
];

const osRules: Array<[RegExp, string, number?]> = [
  [/Windows NT (\d+[\d.]*)/, 'Windows'],
  [/Mac OS X (\d+[._\d]*)/, 'Mac OS'],
  [/Android (\d+[\d.]*)/, 'Android'],
  [/iPhone OS (\d+[._\d]*)/, 'iOS'],
  [/iPad.*OS (\d+[._\d]*)/, 'iOS'],
  [/CrOS \w+ (\d+[\d.]*)/, 'Chrome OS'],
  [/Linux/, 'Linux'],
];

export function parseUserAgent(ua: string): ParsedUserAgent {
  let browserName: string | undefined;
  let browserVersion: string | undefined;
  let osName: string | undefined;
  let osVersion: string | undefined;

  for (const rule of browserRules) {
    const m = ua.match(rule[0]);
    if (m) {
      browserName = rule[1];
      browserVersion = m[1];
      break;
    }
  }

  for (const rule of osRules) {
    const m = ua.match(rule[0]);
    if (m) {
      osName = rule[1];
      osVersion = m[1]?.replace(/_/g, '.');
      break;
    }
  }

  return {
    browser: { name: browserName, version: browserVersion },
    os: { name: osName, version: osVersion },
  };
}
