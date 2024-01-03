import * as faroCoreModule from '@grafana/faro-core';

import * as performanceUtilsModule from './performanceUtils';
import { calculateFaroResourceTiming } from './performanceUtils';
import { performanceResourceEntry } from './performanceUtilsTestData';
import { observeResourceTimings } from './resource';

describe('Navigation observer', () => {
  class MockPerformanceObserver {
    constructor(private cb: PerformanceObserverCallback) {}

    disconnect = jest.fn();

    observe() {
      this.cb(
        {
          getEntries() {
            return [
              {
                name: performanceResourceEntry.name,
                toJSON: () => ({
                  ...performanceResourceEntry,
                }),
              },
            ];
          },
        } as any,
        {} as PerformanceObserver
      );
    }
  }

  const originalPerformanceObserver = (global as any).PerformanceObserver;

  (global as any).PerformanceObserver = MockPerformanceObserver;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
    (global as any).PerformanceObserver = originalPerformanceObserver;
  });

  it('Ignores entries where name matches ignoredUrls entry', () => {
    const mockPushEvent = jest.fn();

    const mockEntryUrlIsIgnored = jest.fn(() => true);
    jest.spyOn(performanceUtilsModule, 'entryUrlIsIgnored').mockImplementationOnce(mockEntryUrlIsIgnored);

    const ignoredUrls = ['http://example.com'];
    observeResourceTimings('123', mockPushEvent, ignoredUrls);

    expect(mockEntryUrlIsIgnored).toBeCalledTimes(1);
    expect(mockEntryUrlIsIgnored).toBeCalledWith(ignoredUrls, performanceResourceEntry.name);

    expect(mockPushEvent).not.toHaveBeenCalled();
  });

  it('Builds entry for first navigation', () => {
    const mockPushEvent = jest.fn();
    jest.spyOn(performanceUtilsModule, 'entryUrlIsIgnored').mockReturnValueOnce(false);

    const mockResourceId = 'abc';
    jest.spyOn(faroCoreModule, 'genShortID').mockReturnValueOnce(mockResourceId);

    const mockNavigationId = '123';
    observeResourceTimings(mockNavigationId, mockPushEvent, ['']);

    expect(mockPushEvent).toHaveBeenCalledTimes(1);
    expect(mockPushEvent).toHaveBeenCalledWith('faro.performance.resource', {
      ...calculateFaroResourceTiming(performanceResourceEntry),
      faroNavigationId: mockNavigationId,
      faroResourceId: mockResourceId,
    });
  });
});
