import * as faroCoreModule from '@grafana/faro-core';

import * as webStorageModule from '../../utils/webStorage';
import { webStorageType } from '../../utils/webStorage';

import { observeAndGetNavigationTimings } from './navigation';
import { NAVIGATION_ID_STORAGE_KEY } from './performanceConstants';
import * as performanceUtilsModule from './performanceUtils';
import { calculateFaroNavigationTiming, calculateFaroResourceTiming } from './performanceUtils';
import { performanceNavigationEntry, performanceResourceEntry } from './performanceUtilsTestData';

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
                name: performanceNavigationEntry.name,
                toJSON: () => ({
                  ...performanceNavigationEntry,
                }),
              },
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
    observeAndGetNavigationTimings(mockPushEvent, ignoredUrls);

    expect(mockEntryUrlIsIgnored).toBeCalledTimes(1);
    expect(mockEntryUrlIsIgnored).toBeCalledWith(ignoredUrls, performanceNavigationEntry.name);

    expect(mockPushEvent).not.toHaveBeenCalled();
  });

  it('Builds entry for first navigation', () => {
    const mockPushEvent = jest.fn();
    jest.spyOn(performanceUtilsModule, 'entryUrlIsIgnored').mockReturnValueOnce(false);

    const mockNavigationId = '123';
    jest.spyOn(faroCoreModule, 'genShortID').mockReturnValueOnce(mockNavigationId);

    observeAndGetNavigationTimings(mockPushEvent, ['']);

    expect(mockPushEvent).toHaveBeenCalledTimes(1);
    expect(mockPushEvent).toHaveBeenCalledWith('faro.performance.navigation', {
      ...calculateFaroResourceTiming(performanceNavigationEntry),
      ...calculateFaroNavigationTiming(performanceNavigationEntry),
      faroNavigationId: mockNavigationId,
      faroPreviousNavigationId: 'unknown',
    });
  });

  it('Builds entry for subsequent navigation', () => {
    const mockPushEvent = jest.fn();
    jest.spyOn(performanceUtilsModule, 'entryUrlIsIgnored').mockReturnValueOnce(false);

    const mockNewNavigationId = '456';
    jest.spyOn(faroCoreModule, 'genShortID').mockReturnValueOnce(mockNewNavigationId);

    const mockPreviousNavigationId = '123';
    jest.spyOn(webStorageModule, 'getItem').mockReturnValueOnce(mockPreviousNavigationId);

    observeAndGetNavigationTimings(mockPushEvent, ['']);

    expect(mockPushEvent).toHaveBeenCalledTimes(1);
    expect(mockPushEvent).toHaveBeenCalledWith('faro.performance.navigation', {
      ...calculateFaroResourceTiming(performanceNavigationEntry),
      ...calculateFaroNavigationTiming(performanceNavigationEntry),
      faroNavigationId: mockNewNavigationId,
      faroPreviousNavigationId: mockPreviousNavigationId,
    });
  });

  it('Stores navigationId in sessionStorage', () => {
    const mockPushEvent = jest.fn();
    jest.spyOn(performanceUtilsModule, 'entryUrlIsIgnored').mockReturnValueOnce(false);

    const mockNewNavigationId = '456';
    jest.spyOn(faroCoreModule, 'genShortID').mockReturnValueOnce(mockNewNavigationId);

    jest.spyOn(webStorageModule, 'getItem').mockReturnValueOnce(null);

    const mockSetItem = jest.fn();
    jest.spyOn(webStorageModule, 'setItem').mockImplementationOnce(mockSetItem);

    observeAndGetNavigationTimings(mockPushEvent, ['']);

    expect(mockSetItem).toHaveBeenCalledTimes(1);
    expect(mockSetItem).toHaveBeenCalledWith(NAVIGATION_ID_STORAGE_KEY, mockNewNavigationId, webStorageType.session);
  });
});
