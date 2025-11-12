import * as faroCoreModule from '@grafana/faro-core';
import { initializeFaro } from '@grafana/faro-core';
import { mockConfig } from '@grafana/faro-core/src/testUtils';

import type { Observable } from '../..';
import * as urlUtilsModule from '../../utils/url';

import { createFaroResourceTiming } from './performanceUtils';
import { performanceResourceEntry } from './performanceUtilsTestData';
import { observeResourceTimings } from './resource';
import type { ResourceEntryMessage } from './types';

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
                name: 'resource_fetch',
                toJSON: () => ({
                  ...performanceResourceEntry,
                  initiatorType: 'fetch',
                  name: 'resource_fetch',
                }),
              },
              {
                name: 'resource_xmlhttprequest',
                toJSON: () => ({
                  ...performanceResourceEntry,
                  initiatorType: 'xmlhttprequest',
                  name: 'resource_xmlhttprequest',
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

  const mockNavigationId = '123';

  const mockObservable = {
    notify: jest.fn(),
  } as unknown as Observable<ResourceEntryMessage>;

  beforeEach(() => {
    jest.resetAllMocks();
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

    jest.spyOn(urlUtilsModule, 'isUrlIgnored').mockImplementation((url) => {
      return url === 'resource_fetch' || url === 'resource_xmlhttprequest';
    });

    initializeFaro(mockConfig({ trackResources: true }));

    observeResourceTimings(mockNavigationId, mockPushEvent, mockObservable);

    expect(mockPushEvent).toHaveBeenCalledTimes(1);
    expect(mockPushEvent).toHaveBeenCalledWith(
      'faro.performance.resource',
      expect.objectContaining({
        faroNavigationId: mockNavigationId,
      }),
      undefined,
      expect.any(Object)
    );
  });

  it('Ignores all entries when all URLs are ignored', () => {
    const mockPushEvent = jest.fn();

    jest.spyOn(urlUtilsModule, 'isUrlIgnored').mockReturnValue(true);

    initializeFaro(mockConfig({ trackResources: true }));

    observeResourceTimings(mockNavigationId, mockPushEvent, mockObservable);

    expect(mockPushEvent).not.toHaveBeenCalled();
  });

  it('Processes entries when no URLs are ignored', () => {
    const mockPushEvent = jest.fn();

    jest.spyOn(urlUtilsModule, 'isUrlIgnored').mockReturnValue(false);

    initializeFaro(mockConfig({ trackResources: true }));

    observeResourceTimings(mockNavigationId, mockPushEvent, mockObservable);

    expect(mockPushEvent).toHaveBeenCalledTimes(3);
  });

  it('Builds entry for first resource', () => {
    const mockPushEvent = jest.fn();
    jest.spyOn(urlUtilsModule, 'isUrlIgnored').mockReturnValueOnce(false);

    const mockResourceId = 'abc';
    jest.spyOn(faroCoreModule, 'genShortID').mockReturnValueOnce(mockResourceId);

    initializeFaro(mockConfig({ trackResources: true }));

    observeResourceTimings(mockNavigationId, mockPushEvent, mockObservable);

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
    jest.spyOn(urlUtilsModule, 'isUrlIgnored').mockReturnValueOnce(false);

    const trackResourcesNotSetConfig = mockConfig({});
    initializeFaro(trackResourcesNotSetConfig);

    observeResourceTimings(mockNavigationId, mockPushEvent, mockObservable);

    expect(mockPushEvent).toHaveBeenCalledTimes(2);
  });

  it('Tracks all resource entries if trackResource is set to true', () => {
    const mockPushEvent = jest.fn();
    jest.spyOn(urlUtilsModule, 'isUrlIgnored').mockReturnValueOnce(false);

    const trackAllResourcesConfig = mockConfig({ trackResources: true });
    initializeFaro(trackAllResourcesConfig);

    observeResourceTimings(mockNavigationId, mockPushEvent, mockObservable);

    expect(mockPushEvent).toHaveBeenCalledTimes(3);
  });

  it('Does not track any resource entries if trackResource is set to false', () => {
    const mockPushEvent = jest.fn();
    jest.spyOn(urlUtilsModule, 'isUrlIgnored').mockReturnValueOnce(false);

    const trackAllResourcesConfig = mockConfig({ trackResources: false });
    initializeFaro(trackAllResourcesConfig);

    observeResourceTimings(mockNavigationId, mockPushEvent, mockObservable);

    expect(mockPushEvent).toHaveBeenCalledTimes(0);
  });

  it('Emits a RESOURCE_ENTRY message when a resource is observed', () => {
    const mockPushEvent = jest.fn();
    jest.spyOn(urlUtilsModule, 'isUrlIgnored').mockReturnValueOnce(false);

    const config = mockConfig({});
    initializeFaro(config);

    observeResourceTimings(mockNavigationId, mockPushEvent, mockObservable);

    expect(mockObservable.notify).toHaveBeenCalledTimes(3);
    expect(mockObservable.notify).toHaveBeenCalledWith({ type: 'resource' });
  });
});
