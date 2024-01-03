import { mockInternalLogger } from '@grafana/faro-core/src/testUtils';

import { PerformanceInstrumentation } from './instrumentation';
import * as performanceUtilsModule from './performanceUtils';
import { performanceNavigationEntry, performanceResourceEntry } from './performanceUtilsTestData';

describe('Performance Instrumentation', () => {
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

  //   it('Starts the performance observers', async () => {
  //     Object.defineProperty(document, 'readyState', {
  //       get() {
  //         return 'complete';
  //       },
  //     });

  //     // jest.mock('./navigation', () => ({
  //     //   getNavigationTimings: Promise.resolve({ faroNavigationId: '123' }),
  //     // }));

  //     // const mockObserveResourceTimings = jest.fn();
  //     // jest.mock('./resource', () => ({
  //     //   observeResourceTimings: () => mockObserveResourceTimings,
  //     // }));

  //     const performance = new PerformanceInstrumentation();
  //     performance.initialize();

  //     document.dispatchEvent(new Event('readystatechange'));

  //     // expect(mockObserveResourceTimings).toHaveBeenCalledTimes(1);
  //   });
});
