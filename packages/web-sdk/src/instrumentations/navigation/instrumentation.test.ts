import { initializeFaro } from '@grafana/faro-core';
import type { EventEvent, Instrumentation, TransportItem } from '@grafana/faro-core';
import { mockConfig, MockTransport } from '@grafana/faro-core/src/testUtils';

import { makeCoreConfig } from '../../config';
import { __resetDomMutationMonitorForTests } from '../_internal/monitors/domMutationMonitor';
import { __resetHttpRequestMonitorForTests } from '../_internal/monitors/httpRequestMonitor';
import { __resetInteractionMonitorForTests } from '../_internal/monitors/interactionMonitor';
import { __resetUrlChangeMonitorForTests } from '../_internal/monitors/urlChangeMonitor';

import { NavigationInstrumentation } from './instrumentation';

async function flushMicrotasks() {
  for (let i = 0; i < 5; i++) {
    await Promise.resolve();
  }
}

describe('NavigationInstrumentation', () => {
  let originalNavigation: any;
  let navigation: any;

  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ['queueMicrotask'] });
    originalNavigation = (window as any).navigation;

    const listeners: Record<string, Function[]> = { currententrychange: [], navigate: [] };
    navigation = {
      currentEntry: { url: window.location.href },
      transition: null,
      addEventListener: (type: string, cb: Function) => listeners[type]?.push(cb),
      removeEventListener: (type: string, cb: Function) => {
        const arr = listeners[type];
        const idx = arr?.indexOf(cb) ?? -1;
        if (idx >= 0) {
          arr!.splice(idx, 1);
        }
      },
      _dispatch: (type: string, ev: any = {}) => listeners[type]?.forEach((cb) => cb(ev)),
    };
    (window as any).navigation = navigation;
  });

  afterEach(() => {
    __resetDomMutationMonitorForTests();
    __resetHttpRequestMonitorForTests();
    __resetInteractionMonitorForTests();
    __resetUrlChangeMonitorForTests();
    (window as any).navigation = originalNavigation;
    jest.useRealTimers();
  });

  it('reports a navigation whose commit is deferred past the inactivity window', async () => {
    const mockTransport = new MockTransport();
    initializeFaro(
      makeCoreConfig(
        mockConfig({
          transports: [mockTransport],
          instrumentations: [new NavigationInstrumentation()],
          experimental: { trackNavigation: true },
        })
      )!
    );

    const initialHref = window.location.href;
    window.dispatchEvent(new Event('pointerdown'));

    // A router intercepts the navigation with a precommitHandler that resolves after the inactivity window
    let commit!: () => void;
    navigation.transition = { committed: new Promise<void>((resolve) => (commit = resolve)) };
    navigation._dispatch('navigate');
    jest.advanceTimersByTime(500);

    navigation.currentEntry = { url: initialHref + '/deferred' };
    navigation._dispatch('currententrychange', { from: { url: initialHref }, navigationType: 'push' });
    commit();
    document.body.appendChild(document.createElement('div'));
    await flushMicrotasks();

    jest.advanceTimersByTime(100);

    const navigationEvents = mockTransport.items.filter(
      (item) => (item as TransportItem<EventEvent>).payload.name === 'faro.navigation'
    ) as Array<TransportItem<EventEvent>>;
    expect(navigationEvents).toHaveLength(1);
    expect(navigationEvents[0]!.payload.attributes).toMatchObject({
      fromUrl: initialHref,
      toUrl: initialHref + '/deferred',
    });
  });
});

type NavigationEntry = Partial<PerformanceNavigationTiming>;

describe('NavigationInstrumentation hard page load', () => {
  const originalPerformanceObserver = (global as any).PerformanceObserver;
  const originalPrerendering = Object.getOwnPropertyDescriptor(document, 'prerendering');
  const originalReferrer = Object.getOwnPropertyDescriptor(document, 'referrer');

  let observerCallback: PerformanceObserverCallback | undefined;
  let observeOptions: PerformanceObserverInit | undefined;
  let disconnect: jest.Mock;
  let transport: MockTransport;
  let instrumentation: Instrumentation;
  let observe: jest.Mock;

  class MockPerformanceObserver {
    constructor(cb: PerformanceObserverCallback) {
      observerCallback = cb;
    }

    observe(options: PerformanceObserverInit) {
      observeOptions = options;
      observe(options);
    }

    disconnect = disconnect;
  }

  function deliver(entries: NavigationEntry[]) {
    observerCallback!(
      { getEntries: () => entries } as unknown as PerformanceObserverEntryList,
      {} as PerformanceObserver
    );
  }

  function setup() {
    transport = new MockTransport();
    instrumentation = new NavigationInstrumentation();
    initializeFaro(mockConfig({ transports: [transport], instrumentations: [instrumentation] }));
  }

  function navigationEvents() {
    return (transport.items as Array<TransportItem<EventEvent>>)
      .map((item) => item.payload)
      .filter((payload) => payload.name === 'faro.navigation');
  }

  beforeEach(() => {
    observerCallback = undefined;
    observeOptions = undefined;
    disconnect = jest.fn();
    observe = jest.fn();
    (global as any).PerformanceObserver = MockPerformanceObserver;
  });

  afterEach(() => {
    instrumentation.destroy?.();
    __resetDomMutationMonitorForTests();
    __resetHttpRequestMonitorForTests();
    __resetInteractionMonitorForTests();
    __resetUrlChangeMonitorForTests();

    if (originalPerformanceObserver) {
      (global as any).PerformanceObserver = originalPerformanceObserver;
    } else {
      delete (global as any).PerformanceObserver;
    }

    if (originalPrerendering) {
      Object.defineProperty(document, 'prerendering', originalPrerendering);
    } else {
      delete (document as any).prerendering;
    }

    if (originalReferrer) {
      Object.defineProperty(document, 'referrer', originalReferrer);
    } else {
      delete (document as any).referrer;
    }
  });

  it('emits one navigation event for the document load', () => {
    Object.defineProperty(document, 'referrer', { configurable: true, get: () => 'https://example.com/from' });

    setup();

    expect(observeOptions).toEqual({ type: 'navigation', buffered: true });

    deliver([{ name: 'https://example.com/to', duration: 1234.5, loadEventEnd: 1234.5 }]);

    expect(disconnect).toHaveBeenCalledTimes(1);
    expect(navigationEvents()).toEqual([
      expect.objectContaining({
        name: 'faro.navigation',
        attributes: {
          fromUrl: 'https://example.com/from',
          toUrl: 'https://example.com/to',
          sameDocument: 'false',
          duration: '1234.5',
        },
      }),
    ]);
  });

  it('sends an empty fromUrl when there is no referrer', () => {
    Object.defineProperty(document, 'referrer', { configurable: true, get: () => '' });

    setup();
    deliver([{ name: 'https://example.com/to', duration: 100, loadEventEnd: 100 }]);

    expect(navigationEvents()[0]?.attributes).toEqual({
      fromUrl: '',
      toUrl: 'https://example.com/to',
      sameDocument: 'false',
      duration: '100',
    });
  });

  it('does not emit when the observer delivers no entry', () => {
    setup();
    deliver([]);

    expect(disconnect).not.toHaveBeenCalled();
    expect(navigationEvents()).toHaveLength(0);
  });

  it('waits for activation on prerendered pages and measures from activationStart', () => {
    let prerendering = true;
    Object.defineProperty(document, 'prerendering', { configurable: true, get: () => prerendering });

    setup();

    expect(observerCallback).toBeUndefined();

    prerendering = false;
    document.dispatchEvent(new Event('prerenderingchange'));

    expect(observeOptions).toEqual({ type: 'navigation', buffered: true });

    deliver([{ name: 'https://example.com/to', duration: 900, loadEventEnd: 900, activationStart: 600 }]);

    expect(navigationEvents()[0]?.attributes?.['duration']).toBe('300');
  });

  it('clamps the duration to zero when activation happened after load', () => {
    setup();
    deliver([{ name: 'https://example.com/to', duration: 500, loadEventEnd: 500, activationStart: 2000 }]);

    expect(navigationEvents()[0]?.attributes?.['duration']).toBe('0');
  });

  it('does nothing when PerformanceObserver is not available', () => {
    delete (global as any).PerformanceObserver;
    delete (window as any).PerformanceObserver;

    expect(() => setup()).not.toThrow();
    expect(navigationEvents()).toHaveLength(0);
  });

  it('waits for load end before emitting and ignores repeated deliveries', () => {
    setup();
    deliver([{ name: 'https://example.com/to', duration: 0, loadEventEnd: 0 }]);

    expect(navigationEvents()).toHaveLength(0);
    expect(disconnect).not.toHaveBeenCalled();

    deliver([{ name: 'https://example.com/to', duration: 150, loadEventEnd: 150 }]);
    deliver([{ name: 'https://example.com/to', duration: 150, loadEventEnd: 150 }]);

    expect(navigationEvents()).toHaveLength(1);
    expect(navigationEvents()[0]?.attributes?.['duration']).toBe('150');
    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it('does not throw when navigation entries are unsupported', () => {
    observe.mockImplementation(() => {
      throw new Error('navigation entries unsupported');
    });

    expect(() => setup()).not.toThrow();
    expect(disconnect).toHaveBeenCalledTimes(1);
    expect(navigationEvents()).toHaveLength(0);
  });

  it('disconnects the pending observer when removed', () => {
    setup();
    instrumentation.destroy!();
    deliver([{ name: 'https://example.com/to', duration: 100, loadEventEnd: 100 }]);

    expect(disconnect).toHaveBeenCalledTimes(1);
    expect(navigationEvents()).toHaveLength(0);
  });

  it('removes the pending activation listener when removed', () => {
    Object.defineProperty(document, 'prerendering', { configurable: true, value: true });
    setup();
    instrumentation.destroy!();
    document.dispatchEvent(new Event('prerenderingchange'));

    expect(observerCallback).toBeUndefined();
    expect(navigationEvents()).toHaveLength(0);
  });
});
