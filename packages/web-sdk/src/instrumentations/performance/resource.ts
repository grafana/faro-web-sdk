import { faro, genShortID } from '@grafana/faro-core';
import type { EventsAPI, Observable, PushEventOptions } from '@grafana/faro-core';

import { isUrlIgnored } from '../../utils/url';

import { RESOURCE_ENTRY } from './performanceConstants';
import { createFaroResourceTiming, getSpanContextFromServerTiming, includePerformanceEntry } from './performanceUtils';
import type { ResourceEntryMessage } from './types';

type SpanContext = PushEventOptions['spanContext'];

const DEFAULT_TRACK_RESOURCES = { initiatorType: ['xmlhttprequest', 'fetch'] };

export function observeResourceTimings(
  faroNavigationId: string,
  pushEvent: EventsAPI['pushEvent'],
  observable: Observable<ResourceEntryMessage>
) {
  const trackResources = faro.config.trackResources;

  const observer = new PerformanceObserver((observedEntries) => {
    const entries = observedEntries.getEntries();

    for (const resourceEntryRaw of entries) {
      if (isUrlIgnored(resourceEntryRaw.name)) {
        continue;
      }

      observable?.notify({
        type: RESOURCE_ENTRY,
      });

      const resourceEntryJson = resourceEntryRaw.toJSON();
      let spanContext: SpanContext = getSpanContextFromServerTiming(resourceEntryJson?.serverTiming);

      if (
        (trackResources == null && includePerformanceEntry(resourceEntryJson, DEFAULT_TRACK_RESOURCES)) ||
        trackResources
      ) {
        const faroResourceEntry = {
          ...createFaroResourceTiming(resourceEntryJson),
          faroNavigationId,
          faroResourceId: genShortID(),
        };

        pushEvent('faro.performance.resource', faroResourceEntry, undefined, {
          spanContext,
          timestampOverwriteMs: performance.timeOrigin + resourceEntryJson.startTime,
        });
      }
    }
  });

  observer.observe({
    type: RESOURCE_ENTRY,
    buffered: true,
  });
}
