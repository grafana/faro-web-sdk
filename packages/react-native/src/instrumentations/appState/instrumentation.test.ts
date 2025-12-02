import { EVENT_APP_STATE_CHANGED, initializeFaro, type EventEvent, type TransportItem } from '@grafana/faro-core';
import { mockConfig, MockTransport } from '@grafana/faro-core/src/testUtils';
import { AppState } from 'react-native';

import { AppStateInstrumentation } from './index';

describe('AppStateInstrumentation', () => {
  let appStateListeners: Array<(state: string) => void> = [];

  beforeEach(() => {
    appStateListeners = [];

    // Mock AppState
    (AppState as any).currentState = 'active';
    (AppState as any).addEventListener = jest.fn((event: string, handler: (state: string) => void) => {
      appStateListeners.push(handler);
      return {
        remove: jest.fn(() => {
          const index = appStateListeners.indexOf(handler);
          if (index > -1) {
            appStateListeners.splice(index, 1);
          }
        }),
      };
    });
  });

  afterEach(() => {
    appStateListeners = [];
  });

  describe('initialization', () => {
    it('should initialize with current app state', () => {
      const transport = new MockTransport();
      const { config } = initializeFaro(
        mockConfig({
          transports: [transport],
          instrumentations: [new AppStateInstrumentation()],
        })
      );

      const instrumentation = config.instrumentations?.[0] as AppStateInstrumentation;
      expect(instrumentation.getCurrentState()).toBe('active');
      expect(instrumentation.isActive()).toBe(true);
      expect(instrumentation.isBackground()).toBe(false);
    });

    it('should register app state change listener', () => {
      initializeFaro(
        mockConfig({
          transports: [new MockTransport()],
          instrumentations: [new AppStateInstrumentation()],
        })
      );

      expect(AppState.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
      expect(appStateListeners).toHaveLength(1);
    });

    it('should have correct name and version', () => {
      const instrumentation = new AppStateInstrumentation();
      expect(instrumentation.name).toBe('@grafana/faro-react-native:instrumentation-appstate');
      expect(typeof instrumentation.version).toBe('string');
    });
  });

  describe('app state changes', () => {
    it('should emit event when app goes to background', () => {
      const transport = new MockTransport();
      initializeFaro(
        mockConfig({
          transports: [transport],
          instrumentations: [new AppStateInstrumentation()],
        })
      );

      // Trigger app state change to background
      appStateListeners.forEach((listener) => listener('background'));

      expect(transport.items).toHaveLength(1);
      const event = transport.items[0] as TransportItem<EventEvent>;
      expect(event.payload.name).toBe(EVENT_APP_STATE_CHANGED);
      expect(event.payload.attributes?.fromState).toBe('active');
      expect(event.payload.attributes?.toState).toBe('background');
      expect(event.payload.attributes).toHaveProperty('duration');
      expect(event.payload.attributes).toHaveProperty('timestamp');
    });

    it('should emit event when app returns to foreground', () => {
      const transport = new MockTransport();
      const { config } = initializeFaro(
        mockConfig({
          transports: [transport],
          instrumentations: [new AppStateInstrumentation()],
        })
      );

      const instrumentation = config.instrumentations?.[0] as AppStateInstrumentation;

      // Go to background
      appStateListeners.forEach((listener) => listener('background'));
      expect(instrumentation.getCurrentState()).toBe('background');
      expect(instrumentation.isBackground()).toBe(true);

      // Return to foreground
      appStateListeners.forEach((listener) => listener('active'));
      expect(instrumentation.getCurrentState()).toBe('active');
      expect(instrumentation.isActive()).toBe(true);

      expect(transport.items).toHaveLength(2);
      const event = transport.items[1] as TransportItem<EventEvent>;
      expect(event.payload.name).toBe(EVENT_APP_STATE_CHANGED);
      expect(event.payload.attributes?.fromState).toBe('background');
      expect(event.payload.attributes?.toState).toBe('active');
    });

    it('should handle inactive state', () => {
      const transport = new MockTransport();
      initializeFaro(
        mockConfig({
          transports: [transport],
          instrumentations: [new AppStateInstrumentation()],
        })
      );

      // Trigger inactive state (e.g., incoming call)
      appStateListeners.forEach((listener) => listener('inactive'));

      expect(transport.items).toHaveLength(1);
      const event = transport.items[0] as TransportItem<EventEvent>;
      expect(event.payload.attributes?.toState).toBe('inactive');
    });

    it('should track multiple state changes', () => {
      const transport = new MockTransport();
      initializeFaro(
        mockConfig({
          transports: [transport],
          instrumentations: [new AppStateInstrumentation()],
        })
      );

      // Sequence of state changes
      appStateListeners.forEach((listener) => listener('inactive'));
      appStateListeners.forEach((listener) => listener('background'));
      appStateListeners.forEach((listener) => listener('active'));

      expect(transport.items).toHaveLength(3);

      const event1 = transport.items[0] as TransportItem<EventEvent>;
      expect(event1.payload.attributes?.fromState).toBe('active');
      expect(event1.payload.attributes?.toState).toBe('inactive');

      const event2 = transport.items[1] as TransportItem<EventEvent>;
      expect(event2.payload.attributes?.fromState).toBe('inactive');
      expect(event2.payload.attributes?.toState).toBe('background');

      const event3 = transport.items[2] as TransportItem<EventEvent>;
      expect(event3.payload.attributes?.fromState).toBe('background');
      expect(event3.payload.attributes?.toState).toBe('active');
    });

    it('should include duration in state change events', () => {
      jest.useFakeTimers();

      const transport = new MockTransport();
      initializeFaro(
        mockConfig({
          transports: [transport],
          instrumentations: [new AppStateInstrumentation()],
        })
      );

      // Advance time and trigger state change
      jest.advanceTimersByTime(5000);
      appStateListeners.forEach((listener) => listener('background'));

      const event = transport.items[0] as TransportItem<EventEvent>;
      const duration = parseInt(event.payload.attributes?.duration as string, 10);
      expect(duration).toBeGreaterThanOrEqual(0);

      jest.useRealTimers();
    });
  });

  describe('state queries', () => {
    it('should return current state', () => {
      const { config } = initializeFaro(
        mockConfig({
          transports: [new MockTransport()],
          instrumentations: [new AppStateInstrumentation()],
        })
      );

      const instrumentation = config.instrumentations?.[0] as AppStateInstrumentation;
      expect(instrumentation.getCurrentState()).toBe('active');

      appStateListeners.forEach((listener) => listener('background'));
      expect(instrumentation.getCurrentState()).toBe('background');
    });

    it('should return current state duration', () => {
      jest.useFakeTimers();

      const { config } = initializeFaro(
        mockConfig({
          transports: [new MockTransport()],
          instrumentations: [new AppStateInstrumentation()],
        })
      );

      const instrumentation = config.instrumentations?.[0] as AppStateInstrumentation;

      jest.advanceTimersByTime(3000);
      const duration = instrumentation.getCurrentStateDuration();
      expect(duration).toBeGreaterThanOrEqual(0);

      jest.useRealTimers();
    });

    it('should check if app is active', () => {
      const { config } = initializeFaro(
        mockConfig({
          transports: [new MockTransport()],
          instrumentations: [new AppStateInstrumentation()],
        })
      );

      const instrumentation = config.instrumentations?.[0] as AppStateInstrumentation;
      expect(instrumentation.isActive()).toBe(true);

      appStateListeners.forEach((listener) => listener('background'));
      expect(instrumentation.isActive()).toBe(false);

      appStateListeners.forEach((listener) => listener('active'));
      expect(instrumentation.isActive()).toBe(true);
    });

    it('should check if app is in background', () => {
      const { config } = initializeFaro(
        mockConfig({
          transports: [new MockTransport()],
          instrumentations: [new AppStateInstrumentation()],
        })
      );

      const instrumentation = config.instrumentations?.[0] as AppStateInstrumentation;
      expect(instrumentation.isBackground()).toBe(false);

      appStateListeners.forEach((listener) => listener('background'));
      expect(instrumentation.isBackground()).toBe(true);

      appStateListeners.forEach((listener) => listener('active'));
      expect(instrumentation.isBackground()).toBe(false);
    });
  });

  describe('unpatch', () => {
    it('should remove app state listener', () => {
      const { config } = initializeFaro(
        mockConfig({
          transports: [new MockTransport()],
          instrumentations: [new AppStateInstrumentation()],
        })
      );

      expect(appStateListeners).toHaveLength(1);

      const instrumentation = config.instrumentations?.[0] as AppStateInstrumentation;
      instrumentation.unpatch();

      expect(appStateListeners).toHaveLength(0);
    });

    it('should handle unpatch when no listener is registered', () => {
      const instrumentation = new AppStateInstrumentation();
      expect(() => instrumentation.unpatch()).not.toThrow();
    });
  });
});
