import { genShortID } from '@grafana/faro-core';
import type { EventsAPI } from '@grafana/faro-core';

import { RESOURCE_ENTRY } from './performanceConstants';
import { createFaroResourceTiming, entryUrlIsIgnored, includePerformanceEntry } from './performanceUtils';
import type { PerformanceEntryAllowProperties } from './types';

type Options = {
  performanceEntryAllowProperties?: PerformanceEntryAllowProperties;
};

export function observeResourceTimings(
  faroNavigationId: string,
  pushEvent: EventsAPI['pushEvent'],
  ignoredUrls: Array<string | RegExp>,
  options: Options = {}
) {
  const observer = new PerformanceObserver((observedEntries) => {
    const entries = observedEntries.getEntries();

    const allowProps = options.performanceEntryAllowProperties;

    for (const resourceEntryRaw of entries) {
      if (entryUrlIsIgnored(ignoredUrls, resourceEntryRaw.name)) {
        return;
      }

      const resourceEntryRawJSON = resourceEntryRaw.toJSON();

      if (includePerformanceEntry(resourceEntryRawJSON, allowProps)) {
        const faroResourceEntry = {
          ...createFaroResourceTiming(resourceEntryRawJSON),
          faroNavigationId,
          faroResourceId: genShortID(),
        };

        pushEvent('faro.performance.resource', faroResourceEntry);
      }
    }
  });

  observer.observe({
    type: RESOURCE_ENTRY,
    buffered: true,
  });
}
