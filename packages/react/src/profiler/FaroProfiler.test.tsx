import { setDependencies } from '../dependencies';

import { FaroProfiler } from './FaroProfiler';

describe('FaroProfiler', () => {
  let mockSpan: { end: jest.Mock };
  let mockChildSpan: { end: jest.Mock };
  let startSpanCalls: Array<{ name: string; options: any }>;
  let setSpanMock: jest.Mock;
  let activeContextMock: jest.Mock;
  let withMock: jest.Mock;

  beforeEach(() => {
    mockSpan = { end: jest.fn() };
    mockChildSpan = { end: jest.fn() };
    startSpanCalls = [];

    let callIdx = 0;
    const startSpan = jest.fn((name: string, options: any) => {
      startSpanCalls.push({ name, options });
      // First call is the mount span (from constructor); subsequent calls are children.
      return callIdx++ === 0 ? mockSpan : mockChildSpan;
    });

    setSpanMock = jest.fn();
    activeContextMock = jest.fn(() => ({}) as any);
    withMock = jest.fn((_ctx: any, fn: () => void) => fn());

    const otelMock: any = {
      trace: {
        getTracer: () => ({ startSpan }),
        setSpan: setSpanMock,
      },
      context: {
        active: activeContextMock,
        with: withMock,
      },
    };

    const apiMock: any = {
      isOTELInitialized: () => true,
      getOTEL: () => otelMock,
    };

    const internalLoggerMock: any = { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() };

    setDependencies(internalLoggerMock, apiMock);
  });

  it('does not pass Date.now() to span.end on mount (lets OTel stamp via monotonic hrTime)', () => {
    const dateNowSpy = jest.spyOn(Date, 'now');

    const profiler = new FaroProfiler({ name: 'C', updateProps: {}, children: null as any });
    profiler.componentDidMount();

    expect(mockSpan.end).toHaveBeenCalledTimes(1);
    // Critical assertion: span.end was called with no wall-clock timestamp argument.
    // OTel's web SDK stamps the end time via its hrTime helper (performance.timeOrigin +
    // performance.now()), which is monotonic. Passing Date.now() here would mix clocks
    // with the mount span's start (auto-stamped by OTel from hrTime).
    expect(mockSpan.end).toHaveBeenCalledWith();
    expect(dateNowSpy).not.toHaveBeenCalled();

    dateNowSpy.mockRestore();
  });

  it('does not pass Date.now() to componentRender child span on unmount', () => {
    const dateNowSpy = jest.spyOn(Date, 'now');

    const profiler = new FaroProfiler({ name: 'C', updateProps: {}, children: null as any });
    profiler.componentDidMount();

    dateNowSpy.mockClear();
    profiler.componentWillUnmount();

    // A componentRender child span should have been created.
    const renderCall = startSpanCalls.find((c) => c.name === 'componentRender');
    expect(renderCall).toBeTruthy();

    // Critical: neither startTime nor endTime should be sourced from Date.now() (wall clock).
    expect(dateNowSpy).not.toHaveBeenCalled();

    // Both timestamps should be undefined (let OTel stamp from hrTime) or, if explicitly
    // provided, derived from a monotonic source. The simplest fix uses undefined.
    if (renderCall!.options) {
      expect(renderCall!.options.startTime).toBeUndefined();
      expect(renderCall!.options.endTime).toBeUndefined();
    }

    dateNowSpy.mockRestore();
  });
});
