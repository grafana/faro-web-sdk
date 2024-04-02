import { genShortID } from '@grafana/faro-core';
import type { EventsAPI } from '@grafana/faro-core';

import { getItem, setItem, webStorageType } from '../../utils';

import { NAVIGATION_ENTRY, NAVIGATION_ID_STORAGE_KEY } from './performanceConstants';
import { createFaroNavigationTiming, entryUrlIsIgnored } from './performanceUtils';
import type { FaroNavigationItem } from './types';

export function getNavigationTimings(
  pushEvent: EventsAPI['pushEvent'],
  ignoredUrls: Array<string | RegExp>
): Promise<FaroNavigationItem> {
  let faroNavigationEntryResolve: (value: FaroNavigationItem) => void;
  const faroNavigationEntryPromise = new Promise<FaroNavigationItem>((resolve) => {
    faroNavigationEntryResolve = resolve;
  });

  const observer = new PerformanceObserver((observedEntries) => {
    const [navigationEntryRaw] = observedEntries.getEntries();

    if (navigationEntryRaw == null || entryUrlIsIgnored(ignoredUrls, navigationEntryRaw.name)) {
      return;
    }

    const faroPreviousNavigationId = getItem(NAVIGATION_ID_STORAGE_KEY, webStorageType.session) ?? 'unknown';

    const faroNavigationEntry: FaroNavigationItem = {
      ...createFaroNavigationTiming(navigationEntryRaw.toJSON()),
      faroNavigationId: genShortID(),
      faroPreviousNavigationId,
    };

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
