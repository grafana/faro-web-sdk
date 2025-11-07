import { Observable } from '@grafana/faro-core';
import type { Subscription } from '@grafana/faro-core';

import { performanceEntriesSubscription } from '../../performance/instrumentation';
import { RESOURCE_ENTRY } from '../../performance/performanceConstants';

import { MESSAGE_TYPE_RESOURCE_ENTRY } from './const';

let performanceObservable: Observable | undefined;
let isSubscribed = false;
let subscription: Subscription | undefined;

export function monitorPerformanceEntries(): Observable {
  if (!performanceObservable) {
    performanceObservable = new Observable();
  }

  if (!isSubscribed) {
    subscription = performanceEntriesSubscription.subscribe((data) => {
      if (data.type === RESOURCE_ENTRY) {
        performanceObservable!.notify({ type: MESSAGE_TYPE_RESOURCE_ENTRY });
      }
    });
    isSubscribed = true;
  }

  return performanceObservable;
}

// Test-only utility to reset state between tests
export function __resetPerformanceEntriesMonitorForTests() {
  if (subscription) {
    subscription.unsubscribe();
  }
  subscription = undefined;
  isSubscribed = false;
  performanceObservable = undefined;
}
