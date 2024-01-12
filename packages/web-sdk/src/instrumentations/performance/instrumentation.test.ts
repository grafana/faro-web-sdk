import { initializeFaro } from '@grafana/faro-core';
import { mockConfig, mockInternalLogger } from '@grafana/faro-core/src/testUtils';

import { PerformanceInstrumentation } from './instrumentation';
import * as navigationModule from './navigation';
import * as performanceUtilsModule from './performanceUtils';
import { performanceNavigationEntry, performanceResourceEntry } from './performanceUtilsTestData';
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
});
