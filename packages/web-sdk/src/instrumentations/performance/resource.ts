import type { EventsAPI } from '@grafana/faro-core';

import { RESOURCE_ENTRY } from './performanceConstants';
import { entryUrlIsIgnored, objectValuesToString } from './util';

export function observeResourceTimings(
  parentNavigationEntry: { navigationId: string },
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
        name: resourceEntryRaw.name,
        navigationId: parentNavigationEntry.navigationId,
        data: {
          ...resourceEntryRaw.toJSON(),
        },
      };

      console.log('faroResourceEntry :>> ', faroResourceEntry);

      pushEvent('faro.performance.resource', objectValuesToString(faroResourceEntry));
    }
  });

  observer.observe({
    type: RESOURCE_ENTRY,
    buffered: true,
  });
}
