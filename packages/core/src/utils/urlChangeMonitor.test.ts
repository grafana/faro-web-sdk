import { __resetUrlChangeMonitorForTests, MESSAGE_TYPE_URL_CHANGE, monitorUrlChanges } from './urlChangeMonitor';

describe('monitorUrlChanges', () => {
  afterEach(() => {
    __resetUrlChangeMonitorForTests();
    jest.restoreAllMocks();
  });

  it('notifies when history.pushState changes the URL', () => {
    const initialHref = window.location.href;
    const observable = monitorUrlChanges();
    const subscriber = jest.fn();
    observable.subscribe(subscriber);

    window.history.pushState({}, '', '/test-push');

    expect(subscriber).toHaveBeenCalledTimes(1);
    expect(subscriber).toHaveBeenCalledWith({
      type: MESSAGE_TYPE_URL_CHANGE,
      from: initialHref,
      to: window.location.href,
      trigger: 'pushState',
    });
  });

  it('notifies on hash changes', () => {
    const initialHref = window.location.href;
    const observable = monitorUrlChanges();
    const subscriber = jest.fn();
    observable.subscribe(subscriber);

    window.location.hash = 'hash-change';
    window.dispatchEvent(new HashChangeEvent('hashchange'));

    expect(subscriber).toHaveBeenCalledTimes(1);
    expect(subscriber).toHaveBeenCalledWith({
      type: MESSAGE_TYPE_URL_CHANGE,
      from: initialHref,
      to: window.location.href,
      trigger: 'hashchange',
    });
  });

  it('returns the same observable on subsequent calls and instruments once', () => {
    const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
    const pushStateSpy = jest.spyOn(window.history, 'pushState');
    const replaceStateSpy = jest.spyOn(window.history, 'replaceState');

    const first = monitorUrlChanges();
    const second = monitorUrlChanges();

    expect(second).toBe(first);

    const popstateCalls = addEventListenerSpy.mock.calls.filter((call) => call[0] === 'popstate');
    const hashchangeCalls = addEventListenerSpy.mock.calls.filter((call) => call[0] === 'hashchange');
    expect(popstateCalls).toHaveLength(1);
    expect(hashchangeCalls).toHaveLength(1);

    window.history.pushState({}, '', '/x');
    window.history.replaceState({}, '', '/y');
    expect(pushStateSpy).toHaveBeenCalled();
    expect(replaceStateSpy).toHaveBeenCalled();
  });

  describe('with Navigation API', () => {
    let originalNavigation: any;
    let originalNavigateEvent: any;

    beforeEach(() => {
      originalNavigation = (window as any).navigation;
      originalNavigateEvent = (window as any).NavigateEvent;

      const listeners: Record<string, Function[]> = { navigate: [] };
      (window as any).navigation = {
        addEventListener: (type: string, callback: Function) => listeners[type]?.push(callback),
        removeEventListener: (type: string, callback: Function) => {
          const callbacks = listeners[type];
          if (!callbacks) {
            return;
          }
          const index = callbacks.indexOf(callback);
          if (index >= 0) {
            callbacks.splice(index, 1);
          }
        },
        _dispatch: (type: string, event: any) => listeners[type]?.forEach((callback) => callback(event)),
      };

      function FakeNavigateEvent(this: any, _type: string, init: any) {
        this.destination = init?.destination;
      }
      (FakeNavigateEvent as any).prototype = { intercept: jest.fn() };
      (window as any).NavigateEvent = FakeNavigateEvent as any;
    });

    afterEach(() => {
      (window as any).navigation = originalNavigation;
      (window as any).NavigateEvent = originalNavigateEvent;
    });

    it('emits on same-document navigate events and does not patch history', () => {
      const initialHref = window.location.href;
      const observable = monitorUrlChanges();
      const subscriber = jest.fn();
      observable.subscribe(subscriber);

      (window as any).navigation._dispatch(
        'navigate',
        new (window as any).NavigateEvent('navigate', {
          destination: { url: initialHref + '#nav', sameDocument: true },
        })
      );

      expect(subscriber).toHaveBeenCalledTimes(1);
      expect(subscriber).toHaveBeenCalledWith({
        type: MESSAGE_TYPE_URL_CHANGE,
        from: initialHref,
        to: initialHref + '#nav',
        trigger: 'navigate',
      });
      expect(Object.getOwnPropertyDescriptor(window.history, 'pushState')?.value).toBeDefined();
      expect(Object.getOwnPropertyDescriptor(window.history, 'replaceState')?.value).toBeDefined();
    });

    it('emits on intercept for cross-document navigations converted to soft navigation', () => {
      const initialHref = window.location.href;
      const observable = monitorUrlChanges();
      const subscriber = jest.fn();
      observable.subscribe(subscriber);

      const event = new (window as any).NavigateEvent('navigate', {
        destination: { url: initialHref + '/soft', sameDocument: false },
      });
      event.canIntercept = true;
      (window as any).NavigateEvent.prototype.intercept.call(event, {});

      expect(subscriber).toHaveBeenCalledTimes(1);
      expect(subscriber).toHaveBeenCalledWith({
        type: MESSAGE_TYPE_URL_CHANGE,
        from: initialHref,
        to: initialHref + '/soft',
        trigger: 'navigate-intercept',
      });
    });
  });
});
