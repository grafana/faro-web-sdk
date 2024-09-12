import * as faroCoreModule from '@grafana/faro-core';

import * as webStorageModule from '../../utils/webStorage';
import { webStorageType } from '../../utils/webStorage';
import { NAVIGATION_ID_STORAGE_KEY } from '../instrumentationConstants';

import { getNavigationTimings } from './navigation';
import * as performanceUtilsModule from './performanceUtils';
import { createFaroNavigationTiming, createFaroResourceTiming } from './performanceUtils';
import { performanceNavigationEntry, performanceResourceEntry } from './performanceUtilsTestData';

describe('Navigation observer', () => {
  const originalTimeOrigin = performance.timeOrigin;
  const mockTimeOriginValue = 1722437937;
  Object.defineProperty(performance, 'timeOrigin', {
    value: mockTimeOriginValue,
    configurable: true,
  });

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

    Object.defineProperty(performance, 'timeOrigin', {
      value: originalTimeOrigin,
      configurable: true,
    });
  });

  it('Ignores entries where name matches ignoredUrls entry', () => {
    const mockPushEvent = jest.fn();

    const mockEntryUrlIsIgnored = jest.fn(() => true);
    jest.spyOn(performanceUtilsModule, 'entryUrlIsIgnored').mockImplementationOnce(mockEntryUrlIsIgnored);

    const ignoredUrls = ['http://example.com'];
    getNavigationTimings(mockPushEvent, ignoredUrls);

    expect(mockEntryUrlIsIgnored).toBeCalledTimes(1);
    expect(mockEntryUrlIsIgnored).toBeCalledWith(ignoredUrls, performanceNavigationEntry.name);

    expect(mockPushEvent).not.toHaveBeenCalled();
  });

  it('Builds entry for first navigation', () => {
    const mockPushEvent = jest.fn();
    jest.spyOn(performanceUtilsModule, 'entryUrlIsIgnored').mockReturnValueOnce(false);

    const mockNavigationId = '123';
    jest.spyOn(faroCoreModule, 'genShortID').mockReturnValueOnce(mockNavigationId);

    getNavigationTimings(mockPushEvent, ['']);

    expect(mockPushEvent).toHaveBeenCalledTimes(1);
    expect(mockPushEvent).toHaveBeenCalledWith(
      'faro.performance.navigation',
      {
        ...createFaroResourceTiming(performanceNavigationEntry),
        ...createFaroNavigationTiming(performanceNavigationEntry),
        faroNavigationId: mockNavigationId,
        faroPreviousNavigationId: faroCoreModule.unknownString,
      },
      undefined,
      {
        spanContext: { traceId: '0af7651916cd43dd8448eb211c80319c', spanId: 'b7ad6b7169203331' },
        timestampOverwriteMs: mockTimeOriginValue,
      }
    );
  });

  it('Captures Server-Timings for w3c trace context', () => {
    const mockPushEvent = jest.fn();
    jest.spyOn(performanceUtilsModule, 'entryUrlIsIgnored').mockReturnValueOnce(false);

    const mockNavigationId = '123';
    jest.spyOn(faroCoreModule, 'genShortID').mockReturnValueOnce(mockNavigationId);

    getNavigationTimings(mockPushEvent, ['']);

    expect(mockPushEvent).toHaveBeenCalledTimes(1);
    expect(mockPushEvent).toHaveBeenNthCalledWith(1, expect.anything(), expect.anything(), undefined, {
      spanContext: { traceId: '0af7651916cd43dd8448eb211c80319c', spanId: 'b7ad6b7169203331' },
      timestampOverwriteMs: mockTimeOriginValue,
    });
  });

  it('Builds entry for subsequent navigation', () => {
    const mockPushEvent = jest.fn();
    jest.spyOn(performanceUtilsModule, 'entryUrlIsIgnored').mockReturnValueOnce(false);

    const mockNewNavigationId = '456';
    jest.spyOn(faroCoreModule, 'genShortID').mockReturnValueOnce(mockNewNavigationId);

    const mockPreviousNavigationId = '123';
    jest.spyOn(webStorageModule, 'getItem').mockReturnValueOnce(mockPreviousNavigationId);

    getNavigationTimings(mockPushEvent, ['']);

    expect(mockPushEvent).toHaveBeenCalledTimes(1);
    expect(mockPushEvent).toHaveBeenCalledWith(
      'faro.performance.navigation',
      {
        ...createFaroResourceTiming(performanceNavigationEntry),
        ...createFaroNavigationTiming(performanceNavigationEntry),
        faroNavigationId: mockNewNavigationId,
        faroPreviousNavigationId: mockPreviousNavigationId,
      },
      undefined,
      {
        spanContext: { traceId: '0af7651916cd43dd8448eb211c80319c', spanId: 'b7ad6b7169203331' },
        timestampOverwriteMs: mockTimeOriginValue,
      }
    );
  });

  it('Stores navigationId in sessionStorage', () => {
    const mockPushEvent = jest.fn();
    jest.spyOn(performanceUtilsModule, 'entryUrlIsIgnored').mockReturnValueOnce(false);

    const mockNewNavigationId = '456';
    jest.spyOn(faroCoreModule, 'genShortID').mockReturnValueOnce(mockNewNavigationId);

    jest.spyOn(webStorageModule, 'getItem').mockReturnValueOnce(null);

    const mockSetItem = jest.fn();
    jest.spyOn(webStorageModule, 'setItem').mockImplementationOnce(mockSetItem);

    getNavigationTimings(mockPushEvent, ['']);

    expect(mockSetItem).toHaveBeenCalledTimes(1);
    expect(mockSetItem).toHaveBeenCalledWith(NAVIGATION_ID_STORAGE_KEY, mockNewNavigationId, webStorageType.session);
  });
});
