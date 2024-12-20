import { genShortID, unknownString } from '@grafana/faro-core';
import type { EventsAPI, PushEventOptions } from '@grafana/faro-core';

import { getItem, setItem, webStorageType } from '../../utils';
import { NAVIGATION_ID_STORAGE_KEY } from '../instrumentationConstants';

import { NAVIGATION_ENTRY } from './performanceConstants';
import { createFaroNavigationTiming, entryUrlIsIgnored, getSpanContextFromServerTiming } from './performanceUtils';
import type { FaroNavigationItem } from './types';

type SpanContext = PushEventOptions['spanContext'];

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

    const navEntryJson = navigationEntryRaw.toJSON();

    let spanContext: SpanContext = getSpanContextFromServerTiming(navEntryJson?.serverTiming);

    const faroPreviousNavigationId = getItem(NAVIGATION_ID_STORAGE_KEY, webStorageType.session) ?? unknownString;

    const faroNavigationEntry: FaroNavigationItem = {
      ...createFaroNavigationTiming(navEntryJson),
      faroNavigationId: genShortID(),
      faroPreviousNavigationId,
    };

    setItem(NAVIGATION_ID_STORAGE_KEY, faroNavigationEntry.faroNavigationId, webStorageType.session);

    pushEvent('faro.performance.navigation', faroNavigationEntry, undefined, {
      spanContext,
      timestampOverwriteMs: performance.timeOrigin + navEntryJson.startTime,
    });

    faroNavigationEntryResolve(faroNavigationEntry);
  });

  observer.observe({
    type: NAVIGATION_ENTRY,
    buffered: true,
  });

  return faroNavigationEntryPromise;
}
