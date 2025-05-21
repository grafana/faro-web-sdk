import { Observable } from '@grafana/faro-core';

import { performanceEntriesSubscription } from '../performance/instrumentation';
import { RESOURCE_ENTRY } from '../performance/performanceConstants';

import { MESSAGE_TYPE_RESOURCE_ENTRY } from './const';

export function monitorPerformanceEntries(): Observable {
  const observable = new Observable();

  performanceEntriesSubscription.subscribe((data) => {
    if (data.type === RESOURCE_ENTRY) {
      observable.notify({ type: MESSAGE_TYPE_RESOURCE_ENTRY });
    }
  });

  return observable;
}
