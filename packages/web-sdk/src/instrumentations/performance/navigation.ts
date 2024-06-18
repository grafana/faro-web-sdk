import { genShortID } from '@grafana/faro-core';
import type { EventsAPI, PushEventOptions } from '@grafana/faro-core';

import { getItem, setItem, webStorageType } from '../../utils';
import { NAVIGATION_ID_STORAGE_KEY } from '../instrumentationConstants';

import { NAVIGATION_ENTRY } from './performanceConstants';
import { createFaroNavigationTiming, entryUrlIsIgnored } from './performanceUtils';
import type { FaroNavigationItem } from './types';

type SpanContext = PushEventOptions['spanContext']

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

    let spanContext: SpanContext = undefined;

    // Extract traceparent from serverTiming, if present
    const { serverTiming = [] }: { serverTiming: PerformanceServerTiming[] } = navEntryJson;
    for (const serverEntry of serverTiming) {
      if (serverEntry.name === 'traceparent') {
        const [, traceId, spanId,] = serverEntry.description.split('-');
        if (traceId != null && spanId != null) {
          spanContext = {traceId, spanId};
        }

        break;
      }
    }

    const faroPreviousNavigationId = getItem(NAVIGATION_ID_STORAGE_KEY, webStorageType.session) ?? 'unknown';

    const faroNavigationEntry: FaroNavigationItem = {
      ...createFaroNavigationTiming(navEntryJson),
      faroNavigationId: genShortID(),
      faroPreviousNavigationId,
    };

    setItem(NAVIGATION_ID_STORAGE_KEY, faroNavigationEntry.faroNavigationId, webStorageType.session);

    pushEvent('faro.performance.navigation', faroNavigationEntry, undefined, { spanContext });

    faroNavigationEntryResolve(faroNavigationEntry);
  });

  observer.observe({
    type: NAVIGATION_ENTRY,
    buffered: true,
  });

  return faroNavigationEntryPromise;
}
