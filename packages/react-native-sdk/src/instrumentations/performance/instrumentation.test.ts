import { initializeFaro } from '@grafana/faro-core';
import type { EventEvent, TransportItem } from '@grafana/faro-core';
import { mockConfig, mockInternalLogger, MockTransport } from '@grafana/faro-core/src/testUtils';

import { FetchTransport } from '../../transports';

import { PerformanceInstrumentation } from './instrumentation';
import * as navigationModule from './navigation';
import * as performanceUtilsModule from './performanceUtils';
import {
  analyticsEntry1,
  analyticsEntry2,
  performanceNavigationEntry,
  performanceResourceEntry,
} from './performanceUtilsTestData';
import * as resourceModule from './resource';
import type { FaroNavigationItem } from './types';

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
            {
              name: analyticsEntry1.name,
              toJSON: () => ({
                ...analyticsEntry1,
              }),
            },
            {
              name: analyticsEntry2.name,
              toJSON: () => ({
                ...analyticsEntry2,
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

describe('Performance Instrumentation', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  afterAll(() => {
    (global as any).PerformanceObserver = originalPerformanceObserver;
  });

  it('Stops initialization if performance observer is not supported', () => {
    jest.spyOn(performanceUtilsModule, 'performanceObserverSupported').mockReturnValueOnce(false);

    const mockOnDocumentReady = jest.fn();
    jest.spyOn(performanceUtilsModule, 'onDocumentReady').mockImplementationOnce(mockOnDocumentReady);

    const performance = new PerformanceInstrumentation();

    const mockDebug = jest.fn();
    performance.internalLogger = { ...mockInternalLogger, debug: mockDebug };

    performance.initialize();

    expect(mockDebug).toHaveBeenCalledTimes(1);
    expect(mockOnDocumentReady).not.toHaveBeenCalled();
  });

  it('Starts the performance observers', async () => {
    const mockOnDocumentReady = jest.fn();
    jest.spyOn(performanceUtilsModule, 'onDocumentReady').mockImplementation((handleReady) => {
      mockOnDocumentReady();
      handleReady();
    });

    const mockObserveResourceTimings = jest.fn();
    jest.spyOn(resourceModule, 'observeResourceTimings').mockImplementationOnce(mockObserveResourceTimings);

    const mockObserveAndGetNavigationTimings = jest.fn();
    jest.spyOn(navigationModule, 'getNavigationTimings').mockImplementationOnce(() => {
      mockObserveAndGetNavigationTimings();
      return Promise.resolve({ faroNavigationId: '123' } as FaroNavigationItem);
    });

    const config = mockConfig({
      instrumentations: [new PerformanceInstrumentation()],
    });

    initializeFaro(config);

    expect(mockOnDocumentReady).toHaveBeenCalledTimes(1);
    expect(await mockObserveAndGetNavigationTimings).toHaveBeenCalledTimes(1);

    expect(mockObserveResourceTimings).toHaveBeenCalledTimes(1);
    expect(mockObserveResourceTimings).toHaveBeenCalledWith('123', expect.anything(), expect.anything());
  });

  it('Excludes entries which match the global ignoreUrls ', async () => {
    const mockObserveAndGetNavigationTimings = jest.fn();
    jest.spyOn(navigationModule, 'getNavigationTimings').mockImplementationOnce(() => {
      mockObserveAndGetNavigationTimings();
      return Promise.resolve({ faroNavigationId: '123' } as FaroNavigationItem);
    });

    const fetchTransport = new FetchTransport({ url: 'abc' });
    const config = mockConfig({
      transports: [fetchTransport],
      instrumentations: [new PerformanceInstrumentation()],
      ignoreUrls: [/.*foo-analytics/, /.*.analytics.com/, 'http://example.com/awesome-image'],
      trackResources: true,
    });

    const faro = initializeFaro(config);

    const mockTransport = new MockTransport(
      faro.transports.transports.flatMap((transport) => transport.getIgnoreUrls())
    );

    faro.transports.add(mockTransport);
    faro.transports.remove(fetchTransport);

    expect(await mockObserveAndGetNavigationTimings).toHaveBeenCalledTimes(1);

    expect(mockTransport.items.length).toBe(1);

    const item = mockTransport.items[0] as TransportItem<EventEvent>;
    expect(item.payload.attributes?.['name']).toBe('http://example.com');
  });
});
