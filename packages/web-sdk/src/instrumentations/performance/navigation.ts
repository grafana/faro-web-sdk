import { genShortID } from '@grafana/faro-core';
import type { EventsAPI } from '@grafana/faro-core';

import { NAVIGATION_ENTRY } from './performanceConstants';
import { entryUrlIsIgnored, objectValuesToString } from './util';

export function observeNavigationTimings(
  resolveNavigationTimingReceived: (value: unknown) => void,
  pushEvent: EventsAPI['pushEvent'],
  ignoredUrls: Array<string | RegExp>
) {
  const observer = new PerformanceObserver((observedEntries) => {
    const entries = observedEntries.getEntries();

    for (const navigationEntryRaw of entries) {
      const name = navigationEntryRaw.name;

      if (entryUrlIsIgnored(ignoredUrls, name)) {
        return;
      }

      const faroNavigationEntry = {
        name,
        navigationId: genShortID(),
        data: {
          ...navigationEntryRaw.toJSON(),
        },
      };

      console.log('faroNavigationEntry :>> ', faroNavigationEntry);

      pushEvent('faro.performance.navigation', objectValuesToString(faroNavigationEntry));
      resolveNavigationTimingReceived(faroNavigationEntry);
    }
  });

  observer.observe({
    type: NAVIGATION_ENTRY,
    buffered: true,
  });
}
