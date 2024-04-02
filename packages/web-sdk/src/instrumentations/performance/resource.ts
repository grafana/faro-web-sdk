import { genShortID } from '@grafana/faro-core';
import type { EventsAPI } from '@grafana/faro-core';

import { RESOURCE_ENTRY } from './performanceConstants';
import { createFaroResourceTiming, entryUrlIsIgnored } from './performanceUtils';

export function observeResourceTimings(
  faroNavigationId: string,
  pushEvent: EventsAPI['pushEvent'],
  ignoredUrls: Array<string | RegExp>
) {
  const observer = new PerformanceObserver((observedEntries) => {
    const entries = observedEntries.getEntries();

    for (const resourceEntryRaw of entries) {
      if (entryUrlIsIgnored(ignoredUrls, resourceEntryRaw.name)) {
        return;
      }

      const faroResourceEntry = {
        ...createFaroResourceTiming(resourceEntryRaw.toJSON()),
        faroNavigationId,
        faroResourceId: genShortID(),
      };

      pushEvent('faro.performance.resource', faroResourceEntry);
    }
  });

  observer.observe({
    type: RESOURCE_ENTRY,
    buffered: true,
  });
}
