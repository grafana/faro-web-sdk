import { genShortID } from '@grafana/faro-core';
import type { EventsAPI } from '@grafana/faro-core';

import { RESOURCE_ENTRY } from './performanceConstants';
import { calculateFaroResourceTimings, entryUrlIsIgnored } from './performanceUtils';
import type { FaroNavigationItem } from './types';

export function observeResourceTimings(
  parentNavigationEntry: FaroNavigationItem,
  pushEvent: EventsAPI['pushEvent'],
  ignoredUrls: Array<string | RegExp>
) {
  const observer = new PerformanceObserver((observedEntries) => {
    const entries = observedEntries.getEntries();

    for (const resourceEntryRaw of entries) {
      const name = resourceEntryRaw.name;

      if (entryUrlIsIgnored(ignoredUrls, name)) {
        return;
      }

      const faroResourceEntry = {
        ...calculateFaroResourceTimings(resourceEntryRaw.toJSON()),
        faroNavigationId: parentNavigationEntry.faroNavigationId,
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
