import { initializeFaro } from '@grafana/faro-core';
import { mockConfig, mockInternalLogger } from '@grafana/faro-core/src/testUtils';

import { DEFAULT_PERFORMANCE_TIMELINE_ENTRY_TYPES, PerformanceTimelineInstrumentation } from './instrumentation';

const navigationAndResourceEntries = [
  {
    name: 'http://entry-one',
    toJSON: () => ({
      name: 'http://entry-one',
      entryType: 'navigation',
      startTime: 0,
      duration: 544,
      initiatorType: 'navigation',
      nextHopProtocol: 'http/1.1',
      workerStart: 0,
      redirectStart: 0,
      redirectEnd: 0,
      fetchStart: 1,
      domainLookupStart: 24,
      domainLookupEnd: 24,
      connectStart: 24,
      connectEnd: 24,
      secureConnectionStart: 0,
      requestStart: 25,
      responseStart: 35,
      responseEnd: 35,
      transferSize: 3039,
      encodedBodySize: 2819,
      decodedBodySize: 2819,
      serverTiming: [],
      unloadEventStart: 37,
      unloadEventEnd: 38,
      domInteractive: 60,
      domContentLoadedEventStart: 543,
      domContentLoadedEventEnd: 543,
      domComplete: 543,
      loadEventStart: 543,
      loadEventEnd: 544,
      type: 'reload',
      redirectCount: 0,
    }),
  },
  {
    name: 'http://entry-two',
    toJSON: () => ({
      name: 'http://entry-two',
      entryType: 'resource',
      startTime: 43,
      duration: 12,
      initiatorType: 'script',
      nextHopProtocol: 'http/1.1',
      workerStart: 0,
      redirectStart: 0,
      redirectEnd: 0,
      fetchStart: 43,
      domainLookupStart: 43,
      domainLookupEnd: 43,
      connectStart: 43,
      connectEnd: 43,
      secureConnectionStart: 0,
      requestStart: 53,
      responseStart: 55,
      responseEnd: 55,
      transferSize: 79270,
      encodedBodySize: 78982,
      decodedBodySize: 78982,
      serverTiming: [],
    }),
  },
  {
    name: 'http://entry-three',
    toJSON: () => ({
      name: 'http://entry-three',
      entryType: 'resource',
      startTime: 43,
      duration: 13,
      initiatorType: 'link',
      nextHopProtocol: 'http/1.1',
      workerStart: 0,
      redirectStart: 0,
      redirectEnd: 0,
      fetchStart: 43,
      domainLookupStart: 53,
      domainLookupEnd: 53,
      connectStart: 53,
      connectEnd: 53,
      secureConnectionStart: 0,
      requestStart: 53,
      responseStart: 56,
      responseEnd: 56,
      transferSize: 234008,
      encodedBodySize: 233732,
      decodedBodySize: 233732,
      serverTiming: [],
    }),
  },
] as const;

const matchNavigationAndResourceEntriesTestResults = [
  {
    name: 'http://entry-one',
    entryType: 'navigation',
    startTime: '0',
    duration: '544',
    initiatorType: 'navigation',
    nextHopProtocol: 'http/1.1',
    workerStart: '0',
    redirectStart: '0',
    redirectEnd: '0',
    fetchStart: '1',
    domainLookupStart: '24',
    domainLookupEnd: '24',
    connectStart: '24',
    connectEnd: '24',
    secureConnectionStart: '0',
    requestStart: '25',
    responseStart: '35',
    responseEnd: '35',
    transferSize: '3039',
    encodedBodySize: '2819',
    decodedBodySize: '2819',
    serverTiming: '[]',
    unloadEventStart: '37',
    unloadEventEnd: '38',
    domInteractive: '60',
    domContentLoadedEventStart: '543',
    domContentLoadedEventEnd: '543',
    domComplete: '543',
    loadEventStart: '543',
    loadEventEnd: '544',
    type: 'reload',
    redirectCount: '0',
  },
  {
    name: 'http://entry-two',
    entryType: 'resource',
    startTime: '43',
    duration: '12',
    initiatorType: 'script',
    nextHopProtocol: 'http/1.1',
    workerStart: '0',
    redirectStart: '0',
    redirectEnd: '0',
    fetchStart: '43',
    domainLookupStart: '43',
    domainLookupEnd: '43',
    connectStart: '43',
    connectEnd: '43',
    secureConnectionStart: '0',
    requestStart: '53',
    responseStart: '55',
    responseEnd: '55',
    transferSize: '79270',
    encodedBodySize: '78982',
    decodedBodySize: '78982',
    serverTiming: '[]',
  },
  {
    name: 'http://entry-three',
    entryType: 'resource',
    startTime: '43',
    duration: '13',
    initiatorType: 'link',
    nextHopProtocol: 'http/1.1',
    workerStart: '0',
    redirectStart: '0',
    redirectEnd: '0',
    fetchStart: '43',
    domainLookupStart: '53',
    domainLookupEnd: '53',
    connectStart: '53',
    connectEnd: '53',
    secureConnectionStart: '0',
    requestStart: '53',
    responseStart: '56',
    responseEnd: '56',
    transferSize: '234008',
    encodedBodySize: '233732',
    decodedBodySize: '233732',
    serverTiming: '[]',
  },
];

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

describe('PerformanceTimelineInstrumentation', () => {
  beforeEach(() => {
    mockObserve.mockClear();
  });

  it('initialize PerformanceTimelineInstrumentation with default options', () => {
    const instrumentation = new PerformanceTimelineInstrumentation();

    const resourceTimingBufferSize = (instrumentation as any).resourceTimingBufferSize;
    expect(resourceTimingBufferSize).toBe(250);

    const maxResourceTimingBufferSize = (instrumentation as any).maxResourceTimingBufferSize;
    expect(maxResourceTimingBufferSize).toBe(1000);

    const observeEntryTypes = (instrumentation as any).observeEntryTypes;
    expect(observeEntryTypes).toMatchObject([
      { buffered: true, type: 'navigation' },
      { buffered: true, type: 'resource' },
    ]);

    // Mocking the Performance object doesn't work. Skip testing its usage for now
    jest.spyOn(instrumentation, 'configureResourceTimingBuffer' as any).mockImplementation(() => {});

    instrumentation.initialize();

    const skipEntries = (instrumentation as any).skipEntries;
    expect(skipEntries).toMatchObject([]);
  });

  it('initialize PerformanceTimelineInstrumentation with custom options', () => {
    const instrumentation = new PerformanceTimelineInstrumentation({
      resourceTimingBufferSize: 500,
      maxResourceTimingBufferSize: 2000,
      observeEntryTypes: [...DEFAULT_PERFORMANCE_TIMELINE_ENTRY_TYPES, { buffered: true, type: 'event' }],
      skipEntries: [{ key: 'foo', value: 'bar' }],
    });

    const resourceTimingBufferSize = (instrumentation as any).resourceTimingBufferSize;
    expect(resourceTimingBufferSize).toBe(500);

    const maxResourceTimingBufferSize = (instrumentation as any).maxResourceTimingBufferSize;
    expect(maxResourceTimingBufferSize).toBe(2000);

    const observeEntryTypes = (instrumentation as any).observeEntryTypes;
    expect(observeEntryTypes).toMatchObject([
      { buffered: true, type: 'navigation' },
      { buffered: true, type: 'resource' },
      { buffered: true, type: 'event' },
    ]);

    // Mocking the Performance object doesn't work. Skip testing its usage for now
    jest.spyOn(instrumentation, 'configureResourceTimingBuffer' as any).mockImplementation(() => {});
    instrumentation.initialize();

    const skipEntries = (instrumentation as any).skipEntries;
    expect(skipEntries).toMatchObject([{ key: 'foo', value: 'bar' }]);
  });

  it('Show message if entry type is not supported by browser', () => {
    const instrumentation = new PerformanceTimelineInstrumentation({
      observeEntryTypes: [{ buffered: true, type: 'foo' }],
    });

    const observeEntryTypes = (instrumentation as any).observeEntryTypes;
    expect(observeEntryTypes).toMatchObject([{ buffered: true, type: 'foo' }]);

    const mockInfo = jest.fn();
    instrumentation.internalLogger = { ...mockInternalLogger, info: mockInfo };

    // Mocking the Performance object doesn't work. Skip testing its usage for now
    jest.spyOn(instrumentation, 'configureResourceTimingBuffer' as any).mockImplementation(() => {});
    instrumentation.initialize();

    expect(mockInfo).toHaveBeenCalledTimes(1);
  });

  it('Observe entries based on "observeEntryTypes" option', () => {
    const instrumentation = new PerformanceTimelineInstrumentation({
      observeEntryTypes: [...DEFAULT_PERFORMANCE_TIMELINE_ENTRY_TYPES, { buffered: true, type: 'event' }],
    });

    // Mocking the Performance object doesn't work. Skip testing its usage for now
    jest.spyOn(instrumentation, 'configureResourceTimingBuffer' as any).mockImplementation(() => {});
    instrumentation.initialize();

    expect(mockObserve).toHaveBeenCalledTimes(3);
    expect(mockObserve).toHaveBeenNthCalledWith(1, { buffered: true, type: 'navigation' });
    expect(mockObserve).toHaveBeenNthCalledWith(2, { buffered: true, type: 'resource' });
    expect(mockObserve).toHaveBeenNthCalledWith(3, { buffered: true, type: 'event' });
  });

  it('Ignore entries based on "ignoredUrls" option', () => {
    const ignoredUrls = ['http://entry-two'];
    const instrumentation = new PerformanceTimelineInstrumentation({
      ignoredUrls,
    });

    const config = mockConfig({ dedupe: true, instrumentations: [instrumentation] });

    // Mocking the Performance object doesn't work. Skip testing its usage for now
    jest.spyOn(instrumentation, 'configureResourceTimingBuffer' as any).mockImplementation(() => {});
    instrumentation.initialize();
    const { api } = initializeFaro(config);

    const mockPushEvent = jest.fn();
    api.pushEvent = mockPushEvent;

    expect((instrumentation as any).ignoredUrls).toMatchObject(ignoredUrls);

    instrumentation.handlePerformanceEntry({ getEntries: () => navigationAndResourceEntries } as any, null as any, 0);

    expect(mockPushEvent).toHaveBeenCalledTimes(2);

    expect(mockPushEvent).toHaveBeenNthCalledWith(
      1,
      'performanceEntry',
      matchNavigationAndResourceEntriesTestResults[0]
    );

    expect(mockPushEvent).toHaveBeenNthCalledWith(
      2,
      'performanceEntry',
      matchNavigationAndResourceEntriesTestResults[2]
    );
  });

  it("Skips all entries containing the key/value pair defined in 'skipEntries'", () => {
    const skipEntriesUnscoped = [{ key: 'entryType', value: 'resource' }];

    const instrumentation = new PerformanceTimelineInstrumentation({
      skipEntries: skipEntriesUnscoped,
    });

    const config = mockConfig({ dedupe: true, instrumentations: [instrumentation] });

    // Mocking the Performance object doesn't work. Skip testing its usage for now
    jest.spyOn(instrumentation, 'configureResourceTimingBuffer' as any).mockImplementation(() => {});
    instrumentation.initialize();
    const { api } = initializeFaro(config);

    const mockPushEvent = jest.fn();
    api.pushEvent = mockPushEvent;

    instrumentation.handlePerformanceEntry({ getEntries: () => navigationAndResourceEntries } as any, null as any, 0);

    expect(mockPushEvent).toHaveBeenCalledTimes(1);

    expect(mockPushEvent).toHaveBeenNthCalledWith(
      1,
      'performanceEntry',
      matchNavigationAndResourceEntriesTestResults[0]
    );
  });

  it("Skips only entries containing the key/value pair for the specific entryTypes defined in 'skipEntries'", () => {
    // Applies to entries scoped by entry type
    const skipEntriesScoped = [
      {
        applyToEntryTypes: ['navigation'],
        skipEntries: [{ key: 'nextHopProtocol', value: 'http/1.1' }],
      },
    ];

    const instrumentation = new PerformanceTimelineInstrumentation({
      skipEntries: skipEntriesScoped,
    });

    const config = mockConfig({ dedupe: true, instrumentations: [instrumentation] });

    // Mocking the Performance object doesn't work. Skip testing its usage for now
    jest.spyOn(instrumentation, 'configureResourceTimingBuffer' as any).mockImplementation(() => {});
    instrumentation.initialize();
    const { api } = initializeFaro(config);

    const mockPushEvent = jest.fn();
    api.pushEvent = mockPushEvent;

    instrumentation.handlePerformanceEntry({ getEntries: () => navigationAndResourceEntries } as any, null as any, 0);

    expect(mockPushEvent).toHaveBeenCalledTimes(2);

    expect(mockPushEvent).toHaveBeenNthCalledWith(
      1,
      'performanceEntry',
      matchNavigationAndResourceEntriesTestResults[1]
    );

    expect(mockPushEvent).toHaveBeenNthCalledWith(
      2,
      'performanceEntry',
      matchNavigationAndResourceEntriesTestResults[2]
    );
  });
});
