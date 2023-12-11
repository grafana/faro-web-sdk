import { genShortID } from '@grafana/faro-core';
import type { EventsAPI } from '@grafana/faro-core';

import { NAVIGATION_ENTRY } from './performanceConstants';
import { calculateResourceTimings, entryUrlIsIgnored, objectValuesToString } from './util';

export function getNavigationTimings(pushEvent: EventsAPI['pushEvent'], ignoredUrls: Array<string | RegExp>) {
  const [navigationEntryRaw] = performance.getEntriesByType(NAVIGATION_ENTRY);

  if (!navigationEntryRaw) {
    return;
  }

  if (entryUrlIsIgnored(ignoredUrls, navigationEntryRaw.name)) {
    return;
  }

  const faroNavigationEntry = {
    ...calculateResourceTimings(navigationEntryRaw.toJSON()),
    ...calculateNavigationTimings(navigationEntryRaw.toJSON()),
    faroNavigationId: genShortID(),
  };

  console.log('faroNavigationEntry :>> ', faroNavigationEntry);

  pushEvent('faro.performance.navigation', objectValuesToString(faroNavigationEntry));

  return faroNavigationEntry;
}

function calculateNavigationTimings(navigationEntryRaw: any) {
  return {
    loadTime: String(navigationEntryRaw.duration),
    visibilityState: document.visibilityState,
  };
}
