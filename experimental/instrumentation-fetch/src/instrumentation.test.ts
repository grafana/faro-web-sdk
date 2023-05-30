// initialize faro with fetch instrumentation
// test that fetch instrumentation is enabled and correctly captures headers
// initailize faro with fetch insturmentation and additional configs
// test that fetch instrumentation is enabled and correctly captures headers + additional details
// for each test, count the number of logs/events that get pushed, make sure they match the expected number
import { FetchInstrumentation } from './instrumentation';

const mockObserve = jest.fn();

class MockPerformanceObserver {
  observe = mockObserve;
  disconnect = jest.fn();

  static supportedEntryTypes: string[] = ['navigation', 'resource', 'event'];
}

(global as any).PerformanceObserver = MockPerformanceObserver;

(global as any).Performance = {
  setResourceTimingBufferSize: jest.fn(),
};

describe('FetchInstrumentation', () => {
  beforeEach(() => {
    mockObserve.mockClear();
  });

  it('initialize FetchInstrumentation with default options', () => {
    const instrumentation = new FetchInstrumentation();

    expect(instrumentation.name).toBe('@grafana/faro-web-sdk:instrumentation-fetch');
  });
});
