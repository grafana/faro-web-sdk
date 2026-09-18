import { type EventEvent, type Faro, type TransportItem } from '@grafana/faro-core';
import { MockTransport } from '@grafana/faro-core/src/testUtils';

import { initializeFaro } from '../../initialize';
import { NAVIGATION_ID_STORAGE_KEY } from '../instrumentationConstants';
import { SessionInstrumentation } from '../session';

import { PerformanceInstrumentation } from './instrumentation';
import * as performanceUtils from './performanceUtils';
import { performanceNavigationEntry, performanceResourceEntry } from './performanceUtilsTestData';

describe('prerendered performance timings', () => {
  const originalPrerendering = Object.getOwnPropertyDescriptor(document, 'prerendering');
  const originalObserver = window.PerformanceObserver;
  let prerendering: boolean;
  let ready: boolean;
  let readyCallbacks: Array<() => void>;
  let observed: PerformanceObserverInit[];
  let faro: Faro;
  let transport: MockTransport;
  let instrumentation: PerformanceInstrumentation;

  beforeEach(() => {
    jest.useFakeTimers();
    window.sessionStorage.clear();
    prerendering = true;
    ready = false;
    readyCallbacks = [];
    observed = [];
    Object.defineProperty(document, 'prerendering', { configurable: true, get: () => prerendering });
    window.PerformanceObserver = class {
      constructor(private callback: PerformanceObserverCallback) {}
      observe(options: PerformanceObserverInit) {
        observed.push(options);
        const entry = options.type === 'navigation' ? performanceNavigationEntry : performanceResourceEntry;
        this.callback(
          { getEntries: () => [{ ...entry, toJSON: () => entry }] } as unknown as PerformanceObserverEntryList,
          this as unknown as PerformanceObserver
        );
      }
    } as unknown as typeof PerformanceObserver;
    jest.spyOn(performanceUtils, 'onDocumentReady').mockImplementation((callback) => {
      if (ready) {
        callback();
      } else {
        readyCallbacks.push(callback);
      }
    });
    transport = new MockTransport();
    instrumentation = new PerformanceInstrumentation();
    faro = initializeFaro({
      app: { name: 'prerender-performance' },
      isolate: true,
      preventGlobalExposure: true,
      transports: [transport],
      instrumentations: [instrumentation, new SessionInstrumentation()],
      sessionTracking: { samplingRate: 1 },
      trackResources: true,
    });
  });

  afterEach(() => {
    faro.pause();
    faro.instrumentations.remove(...faro.instrumentations.instrumentations.reverse());
    if (originalPrerendering) {
      Object.defineProperty(document, 'prerendering', originalPrerendering);
    } else {
      Reflect.deleteProperty(document, 'prerendering');
    }
    window.PerformanceObserver = originalObserver;
    jest.restoreAllMocks();
    jest.clearAllTimers();
    jest.useRealTimers();
    window.sessionStorage.clear();
  });

  function finishLoading() {
    ready = true;
    readyCallbacks.splice(0).forEach((callback) => callback());
  }

  function activate() {
    window.sessionStorage.clear();
    prerendering = false;
    document.dispatchEvent(new Event('prerenderingchange'));
  }

  it.each([false, true])(
    'keeps navigation and resource timings when load finishes before activation=%s',
    async (loaded) => {
      if (loaded) {
        finishLoading();
      }
      await Promise.resolve();
      jest.advanceTimersByTime(2000);
      expect(observed).toEqual([]);
      expect(window.sessionStorage.getItem(NAVIGATION_ID_STORAGE_KEY)).toBeNull();
      expect(transport.items).toEqual([]);

      activate();
      finishLoading();
      await Promise.resolve();
      document.dispatchEvent(new Event('prerenderingchange'));
      jest.advanceTimersByTime(2000);

      const events = transport.items as Array<TransportItem<EventEvent>>;
      const navigation = events.filter((item) => item.payload.name === 'faro.performance.navigation');
      const resources = events.filter((item) => item.payload.name === 'faro.performance.resource');
      expect(navigation).toHaveLength(1);
      expect(resources).toHaveLength(1);
      const navigationId = navigation[0]?.payload.attributes?.['faroNavigationId'];
      expect(navigationId).toEqual(expect.any(String));
      expect(window.sessionStorage.getItem(NAVIGATION_ID_STORAGE_KEY)).toBe(navigationId);
      expect(resources[0]?.payload.attributes?.['faroNavigationId']).toBe(navigationId);
      expect(events.every((item) => item.meta.session?.id === faro.api.getSession()?.id)).toBe(true);
      expect(observed).toEqual([
        { type: 'navigation', buffered: true },
        { type: 'resource', buffered: true },
      ]);
    }
  );

  it.each([false, true])('cancels pending collection when destroyed with activated=%s', async (activated) => {
    if (activated) {
      activate();
    }
    instrumentation.destroy();
    finishLoading();
    if (!activated) {
      activate();
    }
    await Promise.resolve();
    jest.advanceTimersByTime(2000);

    expect(observed).toEqual([]);
    const events = transport.items as Array<TransportItem<EventEvent>>;
    expect(events.map((item) => item.payload.name)).toEqual(['session_start']);
  });
});
