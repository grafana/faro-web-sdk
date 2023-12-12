import { genShortID } from '@grafana/faro-core';
import type { EventsAPI } from '@grafana/faro-core';

import { RESOURCE_ENTRY } from './performanceConstants';
import { calculateResourceTimings, entryUrlIsIgnored } from './util';

export function observeResourceTimings(
  parentNavigationEntry: { faroNavigationId: string },
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
        ...calculateResourceTimings(resourceEntryRaw.toJSON()),
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
