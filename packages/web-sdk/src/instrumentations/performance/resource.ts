import { genShortID } from '@grafana/faro-core';
import type { EventsAPI } from '@grafana/faro-core';

import { faro } from '../..';

import { RESOURCE_ENTRY } from './performanceConstants';
import { createFaroResourceTiming, entryUrlIsIgnored, includePerformanceEntry } from './performanceUtils';

const DEFAULT_TRACK_RESOURCES = { initiatorType: ['xmlhttprequest', 'fetch'] };

export function observeResourceTimings(
  faroNavigationId: string,
  pushEvent: EventsAPI['pushEvent'],
  ignoredUrls: Array<string | RegExp>
) {
  const trackResources = faro.config.trackResources;

  const observer = new PerformanceObserver((observedEntries) => {
    const entries = observedEntries.getEntries();

    for (const resourceEntryRaw of entries) {
      if (entryUrlIsIgnored(ignoredUrls, resourceEntryRaw.name)) {
        return;
      }

      const resourceEntryRawJSON = resourceEntryRaw.toJSON();

      if (
        (trackResources == null && includePerformanceEntry(resourceEntryRawJSON, DEFAULT_TRACK_RESOURCES)) ||
        trackResources
      ) {
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
