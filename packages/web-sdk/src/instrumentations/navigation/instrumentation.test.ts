import { initializeFaro } from '@grafana/faro-core';
import type { EventEvent, TransportItem } from '@grafana/faro-core';
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
