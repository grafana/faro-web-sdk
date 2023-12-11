import { isArray, isObject } from '@grafana/faro-core';

export function objectValuesToString(object: Record<string, any> = {}): Record<string, string> {
  const o: Record<string, any> = {};

  for (const [key, value] of Object.entries(object)) {
    if (isArray(value)) {
      o[key] =
        value.length === 0
          ? JSON.stringify(value)
          : String(value.map((arrayValue: any) => objectValuesToString(arrayValue)));
      continue;
    }

    if (isObject(value)) {
      o[key] = objectValuesToString(value);
      continue;
    }

    o[key] = String(value);
  }

  return o;
}

export function performanceObserverSupported(): boolean {
  return 'PerformanceObserver' in window;
}

export function entryUrlIsIgnored(ignoredUrls: Array<string | RegExp> = [], entryName: string): boolean {
  return ignoredUrls.some((url) => entryName.match(url) != null);
}

export function onDocumentReady(handleReady: () => void) {
  if (document.readyState === 'complete') {
    handleReady();
  } else {
    document.addEventListener('readystatechange', (_event) => {
      if (document.readyState === 'complete') {
        handleReady();
      }
    });
  }
}
