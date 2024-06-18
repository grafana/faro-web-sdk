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

    let spanContext: Pick<SpanContext, 'traceId' | 'spanId'> = {
      traceId: '',
      spanId: '',
    };

    if ('serverTiming' in navEntryJson) {
        const serverTiming = navEntryJson.serverTiming;
        if (serverTiming.length > 0) {
          for (let i = 0; i < serverTiming.length; i++) {
            if (serverTiming[i][0] === 'traceparent') {
              const [version, traceId, spanId, sampled] = serverTiming[i][1].split('-');
              spanContext.traceId = traceId;
              spanContext.spanId = spanId;
              break;
            }
          }
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
