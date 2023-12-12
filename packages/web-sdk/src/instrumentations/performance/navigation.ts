import { genShortID } from '@grafana/faro-core';
import type { EventsAPI } from '@grafana/faro-core';

import { NAVIGATION_ENTRY } from './performanceConstants';
import { calculateNavigationTimings, calculateResourceTimings, entryUrlIsIgnored } from './util';

export async function getNavigationTimings(pushEvent: EventsAPI['pushEvent'], ignoredUrls: Array<string | RegExp>) {
  let faroNavigationEntrySend: (value: unknown) => void;
  const faroNavigationEntry = new Promise((resolve) => {
    faroNavigationEntrySend = resolve;
  });

  const observer = new PerformanceObserver((observedEntries) => {
    const [navigationEntryRaw] = observedEntries.getEntries();

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

    pushEvent('faro.performance.navigation', faroNavigationEntry);

    faroNavigationEntrySend(faroNavigationEntry);
  });

  observer.observe({
    type: NAVIGATION_ENTRY,
    buffered: true,
  });

  return await faroNavigationEntry;
}

// export function getNavigationTimings(pushEvent: EventsAPI['pushEvent'], ignoredUrls: Array<string | RegExp>) {
//   observeResourceTimings();

//   const [navigationEntryRaw] = performance.getEntriesByType(NAVIGATION_ENTRY);

//   if (!navigationEntryRaw) {
//     return;
//   }

//   if (entryUrlIsIgnored(ignoredUrls, navigationEntryRaw.name)) {
//     return;
//   }

//   const faroNavigationEntry = {
//     ...calculateResourceTimings(navigationEntryRaw.toJSON()),
//     ...calculateNavigationTimings(navigationEntryRaw.toJSON()),
//     faroNavigationId: genShortID(),
//   };

//   console.log('faroNavigationEntry :>> ', faroNavigationEntry);

//   pushEvent('faro.performance.navigation', faroNavigationEntry);

//   return faroNavigationEntry;
// }

// export function observeResourceTimings() {
//   const observer = new PerformanceObserver((observedEntries) => {
//     const entries = observedEntries.getEntries();

//     for (const entry of entries) {
//       console.log('entry :>> ', entry);
//     }
//   });

//   observer.observe({
//     type: NAVIGATION_ENTRY,
//     buffered: true,
//   });
// }
