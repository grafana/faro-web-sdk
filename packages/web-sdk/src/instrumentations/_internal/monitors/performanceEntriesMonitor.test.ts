import { performanceEntriesSubscription } from '../../performance/instrumentation';
import { RESOURCE_ENTRY } from '../../performance/performanceConstants';

import { MESSAGE_TYPE_RESOURCE_ENTRY } from './const';
import { __resetPerformanceEntriesMonitorForTests, monitorPerformanceEntries } from './performanceEntriesMonitor';

describe('monitorPerformanceEntries', () => {
  afterEach(() => {
    __resetPerformanceEntriesMonitorForTests();
    jest.resetAllMocks();
  });

  it('emits when a resource performance entry occurs', () => {
    const observable = monitorPerformanceEntries();
    const subscriber = jest.fn();
    observable.subscribe(subscriber);

    performanceEntriesSubscription.notify({ type: RESOURCE_ENTRY } as any);

    expect(subscriber).toHaveBeenCalledTimes(1);
    expect(subscriber).toHaveBeenCalledWith({ type: MESSAGE_TYPE_RESOURCE_ENTRY });
  });

  it('returns the same observable on subsequent calls and subscribes once', () => {
    const subscribeSpy = jest.spyOn(performanceEntriesSubscription, 'subscribe');

    const first = monitorPerformanceEntries();
    const second = monitorPerformanceEntries();

    expect(second).toBe(first);
    expect(subscribeSpy).toHaveBeenCalledTimes(1);

    subscribeSpy.mockRestore();
  });
});
