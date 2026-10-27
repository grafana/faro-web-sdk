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
  let otherFaro: Faro | undefined;
  let transport: MockTransport;
  let instrumentation: PerformanceInstrumentation;
  let resourceInitiatorType: string;

  beforeEach(() => {
    jest.useFakeTimers();
    window.sessionStorage.clear();
    prerendering = true;
    ready = false;
    readyCallbacks = [];
    observed = [];
    otherFaro = undefined;
    resourceInitiatorType = performanceResourceEntry.initiatorType;
    Object.defineProperty(document, 'prerendering', { configurable: true, get: () => prerendering });
    window.PerformanceObserver = class {
      constructor(private callback: PerformanceObserverCallback) {}
      observe(options: PerformanceObserverInit) {
        observed.push(options);
        const entry =
          options.type === 'navigation'
            ? performanceNavigationEntry
            : { ...performanceResourceEntry, initiatorType: resourceInitiatorType };
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
  });

  function start(trackResources: boolean | undefined) {
    faro = initializeFaro({
      app: { name: 'prerender-performance' },
      isolate: true,
      preventGlobalExposure: true,
      transports: [transport],
      instrumentations: [instrumentation, new SessionInstrumentation()],
      sessionTracking: { samplingRate: 1 },
      trackResources,
    });
  }

  afterEach(() => {
    otherFaro?.pause();
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
      start(true);
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
    start(true);
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

  it.each([
    { trackResources: false, otherTrackResources: true, initiatorType: 'img', expectedResources: 0 },
    { trackResources: true, otherTrackResources: false, initiatorType: 'img', expectedResources: 1 },
    { trackResources: undefined, otherTrackResources: true, initiatorType: 'img', expectedResources: 0 },
    { trackResources: undefined, otherTrackResources: false, initiatorType: 'fetch', expectedResources: 1 },
  ])(
    'uses its own trackResources=$trackResources for $initiatorType entries after activation',
    async ({ trackResources, otherTrackResources, initiatorType, expectedResources }) => {
      resourceInitiatorType = initiatorType;
      start(trackResources);
      finishLoading();
      otherFaro = initializeFaro({
        app: { name: 'other-sdk' },
        isolate: true,
        preventGlobalExposure: true,
        transports: [new MockTransport()],
        instrumentations: [],
        sessionTracking: { enabled: false },
        trackResources: otherTrackResources,
      });

      activate();
      await Promise.resolve();
      jest.advanceTimersByTime(2000);

      const events = transport.items as Array<TransportItem<EventEvent>>;
      expect(events.filter((item) => item.payload.name === 'faro.performance.navigation')).toHaveLength(1);
      expect(events.filter((item) => item.payload.name === 'faro.performance.resource')).toHaveLength(
        expectedResources
      );
      expect(events.every((item) => item.meta.app?.name === 'prerender-performance')).toBe(true);
    }
  );
});
