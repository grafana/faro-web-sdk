import { genShortID } from '@grafana/faro-core';
import type { EventsAPI } from '@grafana/faro-core';

import { getItem, setItem, webStorageType } from '../../utils';

import { NAVIGATION_ENTRY } from './performanceConstants';
import { calculateNavigationTimings, calculateResourceTimings, entryUrlIsIgnored } from './performanceUtils';
import type { FaroNavigationEntry } from './types';

export function getNavigationTimings(
  pushEvent: EventsAPI['pushEvent'],
  ignoredUrls: Array<string | RegExp>
): Promise<FaroNavigationEntry> {
  const NAVIGATION_ID_STORAGE_KEY = '__FARO_LAST_NAVIGATION_ID__';

  let faroNavigationEntryResolve: (value: FaroNavigationEntry) => void;
  const faroNavigationEntryPromise = new Promise<FaroNavigationEntry>((resolve) => {
    faroNavigationEntryResolve = resolve;
  });

  const observer = new PerformanceObserver((observedEntries) => {
    const [navigationEntryRaw] = observedEntries.getEntries();

    if (!navigationEntryRaw || entryUrlIsIgnored(ignoredUrls, navigationEntryRaw.name)) {
      return;
    }

    const faroNavigationEntry: FaroNavigationEntry = {
      ...calculateResourceTimings(navigationEntryRaw.toJSON()),
      ...calculateNavigationTimings(navigationEntryRaw.toJSON()),
      faroNavigationId: genShortID(),
    };

    const previousNavigationId = getItem(NAVIGATION_ID_STORAGE_KEY, webStorageType.session);

    if (previousNavigationId) {
      faroNavigationEntry.faroPreviousNavigationId = previousNavigationId;
    }

    setItem(NAVIGATION_ID_STORAGE_KEY, faroNavigationEntry.faroNavigationId, webStorageType.session);

    pushEvent('faro.performance.navigation', faroNavigationEntry);

    faroNavigationEntryResolve(faroNavigationEntry);
  });

  observer.observe({
    type: NAVIGATION_ENTRY,
    buffered: true,
  });

  return faroNavigationEntryPromise;
}
