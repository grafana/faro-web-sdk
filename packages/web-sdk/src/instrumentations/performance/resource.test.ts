import * as faroCoreModule from '@grafana/faro-core';
import { initializeFaro } from '@grafana/faro-core';
import { mockConfig } from '@grafana/faro-core/src/testUtils';

import * as performanceUtilsModule from './performanceUtils';
import { createFaroResourceTiming } from './performanceUtils';
import { performanceResourceEntry } from './performanceUtilsTestData';
import { observeResourceTimings } from './resource';

const originalWindow = window;
describe('Resource observer', () => {
  const originalTimeOrigin = performance.timeOrigin;
  const mockTimeOriginValue = 1000;
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
                name: performanceResourceEntry.name,
                toJSON: () => ({
                  ...performanceResourceEntry,
                }),
              },
              {
                name: 'http://resource_fetch.com',
                toJSON: () => ({
                  ...performanceResourceEntry,
                  initiatorType: 'fetch',
                  name: 'http://resource_fetch.com',
                }),
              },
              {
                name: 'http://resource_xmlhttprequest',
                toJSON: () => ({
                  ...performanceResourceEntry,
                  initiatorType: 'xmlhttprequest',
                  name: 'http://resource_xmlhttprequest',
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

  const mockUrl = 'http://dummy.com';

  beforeEach(() => {
    window = Object.create(window);
    Object.defineProperty(window, 'location', {
      value: {
        href: mockUrl,
        hostname: 'dummy.com',
      },
      writable: true, // possibility to override
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();

    (global as any).PerformanceObserver = originalPerformanceObserver;

    Object.defineProperty(performance, 'timeOrigin', {
      value: originalTimeOrigin,
      configurable: true,
    });

    window = originalWindow;
  });

  it('Ignores entries where name matches ignoredUrls entry', () => {
    const mockPushEvent = jest.fn();

    const mockEntryUrlIsIgnored = jest.fn(() => true);
    jest.spyOn(performanceUtilsModule, 'entryUrlIsIgnored').mockImplementationOnce(mockEntryUrlIsIgnored);

    initializeFaro(mockConfig({ trackResources: true }));

    const ignoredUrls = ['http://dummy.com'];
    observeResourceTimings('123', mockPushEvent, ignoredUrls);

    expect(mockEntryUrlIsIgnored).toHaveBeenCalledTimes(1);
    expect(mockEntryUrlIsIgnored).toHaveBeenCalledWith(ignoredUrls, performanceResourceEntry.name);

    expect(mockPushEvent).not.toHaveBeenCalled();
  });

  it('Builds entry for first resource', () => {
    const mockPushEvent = jest.fn();
    jest.spyOn(performanceUtilsModule, 'entryUrlIsIgnored').mockReturnValueOnce(false);

    const mockResourceId = 'abc';
    jest.spyOn(faroCoreModule, 'genShortID').mockReturnValueOnce(mockResourceId);

    initializeFaro(mockConfig({ trackResources: true }));

    const mockNavigationId = '123';
    observeResourceTimings(mockNavigationId, mockPushEvent, ['']);

    expect(mockPushEvent).toHaveBeenCalledTimes(3);

    expect(mockPushEvent).toHaveBeenNthCalledWith(
      1,
      'faro.performance.resource',
      {
        ...createFaroResourceTiming(performanceResourceEntry),
        faroNavigationId: mockNavigationId,
        faroResourceId: mockResourceId,
      },
      undefined,
      {
        spanContext: { traceId: '0af7651916cd43dd8448eb211c80319c', spanId: 'b7ad6b7169203331' },
        timestampOverwriteMs: mockTimeOriginValue + performanceResourceEntry.startTime,
      }
    );
  });

  it('Tracks default resource entries if trackResource is unset', () => {
    const mockPushEvent = jest.fn();
    jest.spyOn(performanceUtilsModule, 'entryUrlIsIgnored').mockReturnValueOnce(false);

    const trackResourcesNotSetConfig = mockConfig({});
    initializeFaro(trackResourcesNotSetConfig);

    const mockNavigationId = '123';
    observeResourceTimings(mockNavigationId, mockPushEvent, ['']);

    expect(mockPushEvent).toHaveBeenCalledTimes(2);
  });

  it('Tracks all resource entries if trackResource is set to true', () => {
    const mockPushEvent = jest.fn();
    jest.spyOn(performanceUtilsModule, 'entryUrlIsIgnored').mockReturnValueOnce(false);

    const trackAllResourcesConfig = mockConfig({ trackResources: true });
    initializeFaro(trackAllResourcesConfig);

    const mockNavigationId = '123';
    observeResourceTimings(mockNavigationId, mockPushEvent, ['']);

    expect(mockPushEvent).toHaveBeenCalledTimes(3);
  });

  it('Does not track any resource entries if trackResource is set to false', () => {
    const mockPushEvent = jest.fn();
    jest.spyOn(performanceUtilsModule, 'entryUrlIsIgnored').mockReturnValueOnce(false);

    const trackAllResourcesConfig = mockConfig({ trackResources: false });
    initializeFaro(trackAllResourcesConfig);

    const mockNavigationId = '123';
    observeResourceTimings(mockNavigationId, mockPushEvent, ['']);

    expect(mockPushEvent).toHaveBeenCalledTimes(0);
  });
});
