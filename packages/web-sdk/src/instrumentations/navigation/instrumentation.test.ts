import { NavigationInstrumentation } from './instrumentation';
import {
  NAVIGATION_PUSH_STATE,
  NAVIGATION_REPLACE_STATE,
  NAVIGATION_FORWARD,
  NAVIGATION_BACK,
  NAVIGATION_GO,
  NAVIGATION_POPSTATE,
  NAVIGATION_HASHCHANGE,
  NAVIGATION_NAVIGATE,
  NAVIGATION_EVENT_TYPE,
} from './consts';

describe('NavigationInstrumentation', () => {
  let originalHistory: History;
  let originalNavigation: any;
  let pushEvent: jest.Mock;
  let instrumentation: NavigationInstrumentation;

  beforeEach(() => {
    // Mock window.history
    originalHistory = window.history;
    (window as any).history = {
      ...originalHistory,
      pushState: jest.fn(),
      replaceState: jest.fn(),
      forward: jest.fn(),
      back: jest.fn(),
      go: jest.fn(),
    };

    // Mock window.navigation (not widely supported)
    originalNavigation = window.navigation;
    (window as any).navigation = undefined;

    // Mock API
    pushEvent = jest.fn();
    instrumentation = new NavigationInstrumentation();
    (instrumentation as any).api = { pushEvent };
    (instrumentation as any).internalLogger = { info: jest.fn() };
  });

  afterEach(() => {
    (window as any).history = originalHistory;
    (window as any).navigation = originalNavigation;
    jest.restoreAllMocks();
  });

  describe('instrumentHistory', () => {
    it('should push event on pushState', () => {
      instrumentation.initialize();
      window.history.pushState({ foo: 'bar' }, 'title', '/new-url');
      expect(pushEvent).toHaveBeenCalledWith(
        NAVIGATION_PUSH_STATE,
        expect.objectContaining({
          type: NAVIGATION_EVENT_TYPE,
          state: { foo: 'bar' },
          title: 'title',
          fromUrl: expect.any(String),
          toUrl: '/new-url',
        })
      );
    });

    it('should push event on replaceState', () => {
      instrumentation.initialize();
      window.history.replaceState({ foo: 'baz' }, 'title2', '/replace-url');
      expect(pushEvent).toHaveBeenCalledWith(
        NAVIGATION_REPLACE_STATE,
        expect.objectContaining({
          type: NAVIGATION_EVENT_TYPE,
          state: { foo: 'baz' },
          title: 'title2',
          fromUrl: expect.any(String),
          toUrl: '/replace-url',
        })
      );
    });

    it('should push event on forward', () => {
      instrumentation.initialize();
      window.history.forward();
      expect(pushEvent).toHaveBeenCalledWith(
        NAVIGATION_FORWARD,
        expect.objectContaining({
          type: NAVIGATION_EVENT_TYPE,
        })
      );
    });

    it('should push event on back', () => {
      instrumentation.initialize();
      window.history.back();
      expect(pushEvent).toHaveBeenCalledWith(
        NAVIGATION_BACK,
        expect.objectContaining({
          type: NAVIGATION_EVENT_TYPE,
        })
      );
    });

    it('should push event on go', () => {
      instrumentation.initialize();
      window.history.go(2);
      expect(pushEvent).toHaveBeenCalledWith(
        NAVIGATION_GO,
        expect.objectContaining({
          type: NAVIGATION_EVENT_TYPE,
          delta: '2',
        })
      );
    });

    it('should push event on popstate', () => {
      instrumentation.initialize();
      window.dispatchEvent(new PopStateEvent('popstate'));
      expect(pushEvent).toHaveBeenCalledWith(
        NAVIGATION_POPSTATE,
        expect.objectContaining({
          type: NAVIGATION_EVENT_TYPE,
          fromUrl: expect.any(String),
          toUrl: expect.any(String),
        })
      );
    });

    it('should push event on hashchange', () => {
      instrumentation.initialize();
      const event = new HashChangeEvent('hashchange', {
        oldURL: 'http://localhost/#old',
        newURL: 'http://localhost/#new',
      });
      window.dispatchEvent(event);
      expect(pushEvent).toHaveBeenCalledWith(
        NAVIGATION_HASHCHANGE,
        expect.objectContaining({
          type: NAVIGATION_EVENT_TYPE,
          fromUrl: 'http://localhost/#old',
          toUrl: 'http://localhost/#new',
          fromHash: '',
          toHash: '#new',
        })
      );
    });
  });

  describe('instrumentNavigation', () => {
    beforeEach(() => {
      // Provide a mock navigation API
      (window as any).navigation = {
        addEventListener: jest.fn((_, cb) => {
          // Save the callback for manual invocation
          (window as any)._navigationCallback = cb;
        }),
      };
      instrumentation = new NavigationInstrumentation();
      (instrumentation as any).api = { pushEvent };
      (instrumentation as any).internalLogger = { info: jest.fn() };
    });

    it('should push event on navigation.navigate', () => {
      instrumentation.initialize();
      const mockEvent = {
        destination: { url: '/destination' },
        navigationType: 'push',
        userInitiated: true,
        canIntercept: false,
        signal: { aborted: false, reason: undefined },
        hashChange: false,
        formData: undefined,
      };
      (window as any)._navigationCallback(mockEvent);
      expect(pushEvent).toHaveBeenCalledWith(
        `${NAVIGATION_NAVIGATE}.push`,
        expect.objectContaining({
          type: `${NAVIGATION_NAVIGATE}.push`,
          fromUrl: expect.any(String),
          toUrl: '/destination',
          navigationType: 'push',
          userInitiated: 'true',
          canIntercept: 'false',
          signal: expect.any(String),
          hashChange: 'false',
          formData: '',
        })
      );
    });
  });
});
